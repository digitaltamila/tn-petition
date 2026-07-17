import {
  isSignInWithEmailLink,
  sendSignInLinkToEmail,
  signInWithEmailLink,
} from "firebase/auth";
import { auth } from "./firebase";

const emailKey = "tn-petition.resume-email";
const tokenKey = "tn-petition.resume-token";

export function newResumeToken() {
  return crypto.randomUUID();
}

export function resumeTokenFromUrl(url = window.location.href) {
  const current = new URL(url);
  const direct = current.searchParams.get("resume");
  if (direct) return direct;
  const continueUrl = current.searchParams.get("continueUrl");
  if (!continueUrl) return null;
  try {
    return new URL(continueUrl).searchParams.get("resume");
  } catch {
    return null;
  }
}

export function saveResumeLocally(email: string, token: string) {
  localStorage.setItem(emailKey, email);
  localStorage.setItem(tokenKey, token);
}

export function savedResumeEmail() {
  return localStorage.getItem(emailKey) || "";
}

export function savedResumeToken() {
  return localStorage.getItem(tokenKey) || "";
}

export function clearSavedResume() {
  localStorage.removeItem(emailKey);
  localStorage.removeItem(tokenKey);
}

export async function sendResumeLink(email: string, token: string) {
  const url = new URL("/petition", window.location.origin);
  url.searchParams.set("resume", token);
  await sendSignInLinkToEmail(auth, email, {
    url: url.toString(),
    handleCodeInApp: true,
  });
}

export function isResumeEmailLink() {
  return isSignInWithEmailLink(auth, window.location.href);
}

export async function completeResumeEmailLink(email: string) {
  return signInWithEmailLink(auth, email, window.location.href);
}
