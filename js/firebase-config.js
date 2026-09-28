// Firebase project config — safe to be public (it's a client identifier, not a
// secret; access is enforced by Firestore/Auth security rules, not by hiding this).
//
// SETUP (one-time, in the Firebase console at https://console.firebase.google.com):
//   1. Create a project (Spark/free plan is enough). Skip Google Analytics.
//   2. Project settings → General → "Your apps" → Add app → Web (</>) →
//      register it, then copy the firebaseConfig object it shows you into
//      REAL_CONFIG below.
//   3. Build → Authentication → Get started → Sign-in method → enable
//      "Email/Password".
//   4. Build → Authentication → Users → Add user → enter an email + password
//      only you know. This is the one "owner" account.
//   5. Build → Firestore Database → Create database → production mode → pick
//      a region → Enable.
//   6. Firestore → Rules → paste and Publish:
//        rules_version = '2';
//        service cloud.firestore {
//          match /databases/{database}/documents {
//            match /public/rehabgrid {
//              allow read: if true;
//              allow write: if request.auth != null;
//            }
//          }
//        }
//      (Reads are public — that's the point, everyone sees your progress.
//      Writes need to be signed in — and since this app never offers public
//      sign-up, the only account that can ever sign in is the one you made
//      in step 4.)
//   7. Replace REAL_CONFIG below with the object from step 2 and push.
//
// Until this is filled in, the site quietly runs in local-only mode (each
// browser keeps its own private copy, nothing shared) — nothing breaks.

var REAL_CONFIG = {
  apiKey: "REPLACE_ME",
  authDomain: "REPLACE_ME",
  projectId: "REPLACE_ME",
  storageBucket: "REPLACE_ME",
  messagingSenderId: "REPLACE_ME",
  appId: "REPLACE_ME"
};

window.FIREBASE_CONFIG = (REAL_CONFIG.apiKey === "REPLACE_ME") ? null : REAL_CONFIG;
