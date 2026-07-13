import { useEffect, useState } from "react";
import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  setDoc,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import type { Recipient } from "../types";
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
export function Admin() {
  const [allowed, setAllowed] = useState<boolean>(),
    [items, setItems] = useState<Recipient[]>([]),
    [form, setForm] = useState(empty),
    [error, setError] = useState("");
  const load = async () => {
    const token = await auth.currentUser?.getIdTokenResult(true);
    setAllowed(token?.claims.admin === true);
    if (token?.claims.admin === true) {
      const s = await getDocs(
        query(
          collection(db, "governmentRecipients"),
          orderBy("departmentName"),
        ),
      );
      setItems(s.docs.map((d) => ({ id: d.id, ...d.data() }) as Recipient));
    }
  };
  useEffect(() => auth.onAuthStateChanged(() => void load()), []);
  const login = () =>
    signInWithPopup(auth, new GoogleAuthProvider()).catch((e) =>
      setError(e.message),
    );
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
  if (allowed === undefined)
    return (
      <div className="mx-auto max-w-xl px-4 py-12">
        <button className="btn-primary" onClick={login}>
          Admin Google sign-in
        </button>
        {error && <p>{error}</p>}
      </div>
    );
  if (!allowed)
    return (
      <div className="card mx-auto my-12 max-w-xl">
        <h1 className="text-2xl font-bold">Access denied</h1>
        <p className="my-4">
          This account does not have the Firebase <code>admin: true</code>{" "}
          custom claim.
        </p>
        <button className="btn-secondary" onClick={() => signOut(auth)}>
          Sign out
        </button>
      </div>
    );
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex justify-between">
        <h1 className="text-3xl font-bold text-navy">Admin dashboard</h1>
        <button onClick={() => signOut(auth)}>Sign out</button>
      </div>
      <p className="my-5 rounded-lg bg-amber-50 p-4">
        A recipient must remain inactive and “Needs verification” until its
        email and official source URL are manually checked. The public workflow
        never accepts arbitrary addresses.
      </p>
      <section className="card">
        <h2 className="text-xl font-bold">Government recipients</h2>
        {error && <p className="my-3 text-red-700">{error}</p>}
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {(
            [
              "departmentName",
              "email",
              "recipientType",
              "lastVerifiedDate",
              "sourceUrl",
            ] as const
          ).map((k) => (
            <label key={k}>
              <span className="label">{k}</span>
              <input
                className="field"
                type={k === "lastVerifiedDate" ? "date" : "text"}
                value={form[k] || ""}
                onChange={(e) => setForm({ ...form, [k]: e.target.value })}
              />
            </label>
          ))}
          <label>
            <span className="label">Delivery</span>
            <select
              className="field"
              value={form.delivery}
              onChange={(e) =>
                setForm({ ...form, delivery: e.target.value as "to" | "cc" })
              }
            >
              <option>to</option>
              <option>cc</option>
            </select>
          </label>
          <label>
            <span className="label">Verification</span>
            <select
              className="field"
              value={form.verificationStatus}
              onChange={(e) =>
                setForm({
                  ...form,
                  verificationStatus: e.target
                    .value as Recipient["verificationStatus"],
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
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
            />{" "}
            Active
          </label>
        </div>
        <button className="btn-primary mt-5" onClick={save}>
          Add recipient
        </button>
      </section>
      <div className="mt-6 space-y-3">
        {items.map((x) => (
          <article className="card flex justify-between gap-4" key={x.id}>
            <div>
              <b>{x.departmentName}</b>
              <p className="text-sm">
                {x.email} · {x.verificationStatus} ·{" "}
                {x.active ? "active" : "inactive"}
              </p>
            </div>
            <button
              className="text-red-700"
              onClick={async () => {
                await deleteDoc(doc(db, "governmentRecipients", x.id));
                await load();
              }}
            >
              Delete
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}
