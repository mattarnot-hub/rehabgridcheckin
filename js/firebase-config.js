// Firebase project config — safe to be public (it's a client identifier, not a
// secret; access is enforced by Firestore/Auth security rules, not by hiding this).
//
// SETUP (one-time, in the Firebase console at https://console.firebase.google.com):
//   1. Create a project (Spark/free plan is enough).
//   2. Project settings → General → "Your apps" → Add app → Web (</>) →
//      register it, then copy the firebaseConfig object it shows you into
//      REAL_CONFIG below.
//   3. Build → Authentication → Get started → Sign-in method → enable
//      "Email/Password".
//   4. Build → Authentication → Users → Add user → use the SAME email as
//      OWNER_EMAIL below, and a password only you know (this is a fresh
//      password for this app — not your Google account password).
//   5. Build → Firestore Database → Create database → production mode → pick
//      a region → Enable.
//   6. Firestore → Rules → paste and Publish (replace the email with yours):
//        rules_version = '2';
//        service cloud.firestore {
//          match /databases/{database}/documents {
//            match /public/rehabgrid {
//              allow read: if true;
//              allow write: if request.auth != null
//                            && request.auth.token.email == 'OWNER_EMAIL_HERE';
//            }
//          }
//        }
//      (Reads are public — that's the point, everyone sees your progress.
//      The app never offers public sign-up, so the only account that can
//      ever sign in is the one you made in step 4; the rule above is a
//      second layer restricting writes to that exact email regardless.)
//   7. Replace REAL_CONFIG and OWNER_EMAIL below and push.
//
// (We tried "Sign in with Google" first, but it hit a persistent
// auth/internal-error — almost certainly an incomplete OAuth consent
// screen / API setup on the Google Cloud side of this project. Plain
// email/password sidesteps that whole cross-domain flow and is what
// Matt's other app, Marriage Check-In, already uses successfully.)
//
// Until REAL_CONFIG is filled in, the site quietly runs in local-only mode
// (each browser keeps its own private copy, nothing shared) — nothing breaks.

var REAL_CONFIG = {
  apiKey: "AIzaSyBpwHe9VhE5n9uBHun5rrj7ZviGZWl3PCY",
  authDomain: "rehab-matt.firebaseapp.com",
  projectId: "rehab-matt",
  storageBucket: "rehab-matt.firebasestorage.app",
  messagingSenderId: "784862064594",
  appId: "1:784862064594:web:35aeec52c541d14e43e20b"
};

// The only Google account allowed to write (must match exactly, including case).
window.OWNER_EMAIL = "mattarnot@gmail.com";

window.FIREBASE_CONFIG = (REAL_CONFIG.apiKey === "REPLACE_ME") ? null : REAL_CONFIG;
