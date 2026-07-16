import { useEffect, useMemo, useState } from "react";
import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import type { Recipient } from "../types";

const academyAdminEmail = "info@muppadaitrainingacademy.com";
const empty: Omit<Recipient, "id"> = {
  departmentName: "",
  email: "",
  recipientType: "government_department",
  delivery: "to",
  active: false,
  verificationStatus: "needs_verification",
  lastVerifiedDate: "",
  sourceUrl: "",
};

type Submission = {
  id: string;
  petitionReference: string;
  studentName: string;
  emailMasked: string;
  district: string;
  campaignId: string;
  sendStatus: "success" | "failed" | "processing";
  gmailSendStatus?: string;
  recipientDepartmentNames: string[];
  submissionTimestamp?: unknown;
  sentAt?: string;
};

type Counts = {
  total: number;
  success: number;
  failed: number;
  processing: number;
};

function asDate(value: unknown) {
  if (!value) return undefined;
  if (typeof value === "string") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }
  if (typeof value === "object" && value !== null) {
    const timestamp = value as {
      toDate?: () => Date;
      seconds?: number;
    };
    if (typeof timestamp.toDate === "function") return timestamp.toDate();
    if (typeof timestamp.seconds === "number")
      return new Date(timestamp.seconds * 1000);
  }
  return undefined;
}

function submissionDate(item: Submission) {
  return asDate(item.submissionTimestamp) || asDate(item.sentAt);
}

function csvCell(value: string | number) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

export function Admin() {
  const [allowed, setAllowed] = useState<boolean | null>(),
    [items, setItems] = useState<Recipient[]>([]),
    [submissions, setSubmissions] = useState<Submission[]>([]),
    [counts, setCounts] = useState<Counts>({
      total: 0,
      success: 0,
      failed: 0,
      processing: 0,
    }),
    [form, setForm] = useState(empty),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState("all"),
    [period, setPeriod] = useState("all"),
    [snapshotTime, setSnapshotTime] = useState(0),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");

  const load = async () => {
    const user = auth.currentUser;
    if (!user) {
      setAllowed(null);
      setItems([]);
      setSubmissions([]);
      return;
    }
    const token = await user.getIdTokenResult(true);
    const isAllowed =
      token.claims.admin === true ||
      (user.emailVerified &&
        user.email?.toLowerCase() === academyAdminEmail.toLowerCase());
    setAllowed(isAllowed);
    if (!isAllowed) return;

    setLoading(true);
    setError("");
    try {
      const petitions = collection(db, "petitions");
      const [recipientSnapshot, submissionSnapshot, total, success, failed] =
        await Promise.all([
          getDocs(
            query(
              collection(db, "governmentRecipients"),
              orderBy("departmentName"),
            ),
          ),
          getDocs(
            query(
              petitions,
              orderBy("submissionTimestamp", "desc"),
              limit(1000),
            ),
          ),
          getCountFromServer(petitions),
          getCountFromServer(
            query(petitions, where("sendStatus", "==", "success")),
          ),
          getCountFromServer(
            query(petitions, where("sendStatus", "==", "failed")),
          ),
        ]);
      const totalCount = total.data().count;
      const successCount = success.data().count;
      const failedCount = failed.data().count;
      setCounts({
        total: totalCount,
        success: successCount,
        failed: failedCount,
        processing: Math.max(0, totalCount - successCount - failedCount),
      });
      setItems(
        recipientSnapshot.docs.map(
          (entry) => ({ id: entry.id, ...entry.data() }) as Recipient,
        ),
      );
      setSubmissions(
        submissionSnapshot.docs.map(
          (entry) => ({ id: entry.id, ...entry.data() }) as Submission,
        ),
      );
      setSnapshotTime(Date.now());
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "The dashboard could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(
    () => auth.onAuthStateChanged(() => void load()),
    [],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const now = snapshotTime;
    const periodDays = period === "today" ? 1 : Number(period.replace("d", ""));
    return submissions.filter((item) => {
      if (status !== "all" && item.sendStatus !== status) return false;
      if (period !== "all") {
        const date = submissionDate(item);
        if (!date || now - date.getTime() > periodDays * 86_400_000)
          return false;
      }
      if (!term) return true;
      return [
        item.petitionReference,
        item.studentName,
        item.emailMasked,
        item.district,
        ...(item.recipientDepartmentNames || []),
      ]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [submissions, search, status, period, snapshotTime]);

  const todayCount = useMemo(() => {
    const today = new Date(snapshotTime).toDateString();
    return submissions.filter(
      (item) =>
        item.sendStatus === "success" &&
        submissionDate(item)?.toDateString() === today,
    ).length;
  }, [submissions, snapshotTime]);

  const districtSummary = useMemo(() => {
    const grouped = new Map<string, number>();
    submissions
      .filter((item) => item.sendStatus === "success")
      .forEach((item) =>
        grouped.set(item.district || "Unknown", (grouped.get(item.district) || 0) + 1),
      );
    return [...grouped.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [submissions]);

  const login = () => {
    setError("");
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ login_hint: academyAdminEmail });
    void signInWithPopup(auth, provider).catch((loginError: unknown) =>
      setError(
        loginError instanceof Error
          ? loginError.message
          : "Google sign-in failed.",
      ),
    );
  };

  const save = async () => {
    if (
      !form.departmentName ||
      !/^\S+@\S+\.\S+$/.test(form.email) ||
      !form.sourceUrl
    ) {
      setError("Department, valid email and official source URL are required.");
      return;
    }
    await setDoc(doc(collection(db, "governmentRecipients")), {
      ...form,
      updatedAt: new Date().toISOString(),
    });
    setForm(empty);
    await load();
  };

  const exportCsv = () => {
    const rows = [
      [
        "Petition reference",
        "Applicant",
        "Masked email",
        "District",
        "Recipients",
        "Status",
        "Submitted at",
      ],
      ...filtered.map((item) => [
        item.petitionReference,
        item.studentName,
        item.emailMasked,
        item.district,
        (item.recipientDepartmentNames || []).join("; "),
        item.sendStatus,
        submissionDate(item)?.toISOString() || "",
      ]),
    ];
    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(
      new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }),
    );
    link.download = `petition-submissions-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  if (allowed === undefined)
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center text-slate-600">
        Loading secure administration…
      </div>
    );

  if (allowed === null)
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <section className="card text-center">
          <p className="text-sm font-bold uppercase tracking-wider text-green">
            Secure administration
          </p>
          <h1 className="mt-3 text-2xl font-bold text-navy">
            Petition dashboard
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Sign in with the authorised Muppadai Training Academy Google
            account to view submissions.
          </p>
          <button className="btn-primary mt-6 w-full" onClick={login}>
            Continue with Google
          </button>
          <p className="mt-3 text-xs text-slate-500">{academyAdminEmail}</p>
          {error && <p className="mt-4 text-sm text-red-700">{error}</p>}
        </section>
      </div>
    );

  if (!allowed)
    return (
      <div className="card mx-auto my-12 max-w-xl">
        <h1 className="text-2xl font-bold">Access denied</h1>
        <p className="my-4">
          This Google account is not authorised to view petition submissions.
        </p>
        <button className="btn-secondary" onClick={() => signOut(auth)}>
          Sign out and use {academyAdminEmail}
        </button>
      </div>
    );

  return (
    <div className="mx-auto max-w-7xl px-3 py-7 sm:px-5 md:py-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-green">
            Muppadai Training Academy
          </p>
          <h1 className="mt-1 text-2xl font-bold text-navy sm:text-3xl">
            Submission dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Signed in as {auth.currentUser?.email}
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" disabled={loading} onClick={() => void load()}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
          <button className="btn-secondary" onClick={() => signOut(auth)}>
            Sign out
          </button>
        </div>
      </header>

      {error && (
        <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
          {error}
        </p>
      )}

      <section className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          ["Total records", counts.total, "text-navy"],
          ["Successfully sent", counts.success, "text-emerald-700"],
          ["Sent today", todayCount, "text-blue-700"],
          ["Failed", counts.failed, "text-red-700"],
          ["Processing", counts.processing, "text-amber-700"],
        ].map(([label, value, color]) => (
          <article className="card p-4 sm:p-5" key={label}>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              {label}
            </p>
            <p className={`mt-2 text-3xl font-bold ${color}`}>{value}</p>
          </article>
        ))}
      </section>

      <section className="mt-6 grid gap-5 lg:grid-cols-[1fr_2fr]">
        <article className="card p-5">
          <h2 className="text-lg font-bold text-navy">Top districts</h2>
          <div className="mt-4 space-y-3">
            {districtSummary.length ? (
              districtSummary.map(([district, count]) => (
                <div className="flex items-center justify-between gap-4" key={district}>
                  <span className="text-sm font-medium">{district}</span>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-bold text-green">
                    {count}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No successful submissions yet.</p>
            )}
          </div>
        </article>

        <article className="card overflow-hidden p-0">
          <div className="border-b border-slate-200 p-5">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
              <label className="flex-1">
                <span className="label">Search submissions</span>
                <input
                  className="field"
                  placeholder="Reference, applicant, district or MLA"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>
              <label>
                <span className="label">Status</span>
                <select className="field" value={status} onChange={(event) => setStatus(event.target.value)}>
                  <option value="all">All statuses</option>
                  <option value="success">Successful</option>
                  <option value="failed">Failed</option>
                  <option value="processing">Processing</option>
                </select>
              </label>
              <label>
                <span className="label">Date</span>
                <select className="field" value={period} onChange={(event) => setPeriod(event.target.value)}>
                  <option value="all">All dates</option>
                  <option value="today">Today</option>
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                </select>
              </label>
              <button className="btn-primary shrink-0" disabled={!filtered.length} onClick={exportCsv}>
                Export CSV
              </button>
            </div>
            <p className="mt-3 text-sm text-slate-500">
              Showing {filtered.length} of the latest {submissions.length} records.
              Headline totals include the complete database.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">Reference / applicant</th>
                  <th className="px-5 py-3">District</th>
                  <th className="px-5 py-3">Recipient</th>
                  <th className="px-5 py-3">Submitted</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((item) => {
                  const date = submissionDate(item);
                  return (
                    <tr className="align-top hover:bg-slate-50/70" key={item.id}>
                      <td className="px-5 py-4">
                        <p className="font-bold text-navy">{item.petitionReference}</p>
                        <p className="mt-1">{item.studentName}</p>
                        <p className="text-xs text-slate-500">{item.emailMasked}</p>
                      </td>
                      <td className="px-5 py-4 font-medium">{item.district}</td>
                      <td className="max-w-xs px-5 py-4 text-slate-600">
                        {(item.recipientDepartmentNames || []).join(", ") || "—"}
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {date ? date.toLocaleString("en-IN") : "—"}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-bold capitalize ${
                            item.sendStatus === "success"
                              ? "bg-emerald-100 text-emerald-800"
                              : item.sendStatus === "failed"
                                ? "bg-red-100 text-red-800"
                                : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {item.sendStatus}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {!filtered.length && !loading && (
                  <tr>
                    <td className="px-5 py-10 text-center text-slate-500" colSpan={5}>
                      No submissions match these filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <details className="card mt-7">
        <summary className="cursor-pointer text-lg font-bold text-navy">
          Manage government recipients ({items.length})
        </summary>
        <p className="my-5 rounded-lg bg-amber-50 p-4 text-sm">
          A recipient must remain inactive and “Needs verification” until its
          email and official source URL are manually checked.
        </p>
        <section>
          <h2 className="text-xl font-bold">Add recipient</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {(
              [
                "departmentName",
                "email",
                "recipientType",
                "lastVerifiedDate",
                "sourceUrl",
              ] as const
            ).map((key) => (
              <label key={key}>
                <span className="label">{key}</span>
                <input
                  className="field"
                  type={key === "lastVerifiedDate" ? "date" : "text"}
                  value={form[key] || ""}
                  onChange={(event) => setForm({ ...form, [key]: event.target.value })}
                />
              </label>
            ))}
            <label>
              <span className="label">Delivery</span>
              <select
                className="field"
                value={form.delivery}
                onChange={(event) =>
                  setForm({ ...form, delivery: event.target.value as "to" | "cc" })
                }
              >
                <option value="to">to</option>
                <option value="cc">cc</option>
              </select>
            </label>
            <label>
              <span className="label">Verification</span>
              <select
                className="field"
                value={form.verificationStatus}
                onChange={(event) =>
                  setForm({
                    ...form,
                    verificationStatus: event.target.value as Recipient["verificationStatus"],
                    active: false,
                  })
                }
              >
                <option value="needs_verification">Needs verification</option>
                <option value="verified">Verified</option>
              </select>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={form.active}
                disabled={form.verificationStatus !== "verified"}
                onChange={(event) => setForm({ ...form, active: event.target.checked })}
              />
              Active
            </label>
          </div>
          <button className="btn-primary mt-5" onClick={() => void save()}>
            Add recipient
          </button>
        </section>
        <div className="mt-6 max-h-[36rem] space-y-3 overflow-y-auto">
          {items.map((item) => (
            <article className="flex justify-between gap-4 rounded-xl border p-4" key={item.id}>
              <div>
                <b>{item.departmentName}</b>
                <p className="break-all text-sm text-slate-500">
                  {item.email} · {item.verificationStatus} · {item.active ? "active" : "inactive"}
                </p>
              </div>
              <button
                className="text-red-700"
                onClick={async () => {
                  await deleteDoc(doc(db, "governmentRecipients", item.id));
                  await load();
                }}
              >
                Delete
              </button>
            </article>
          ))}
        </div>
      </details>
    </div>
  );
}
