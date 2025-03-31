"use client";

import { useState } from "react";
import { auth, db } from "../../../lib/firebase"; // Use named imports
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Login() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"student" | "teacher" | "admin" | "accountsadmin">("student");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username) {
      setError("Username is required");
      return;
    }

    try {
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const userData = userDoc.data();

      if (userData?.name !== username || userData?.role !== role) {
        setError("Username or role does not match registered data");
        return;
      }

      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Login failed");
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{
        backgroundImage: "url('https://www.pcc.edu.jm/img/blog-img/1.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h2 className="text-3xl font-bold text-red-900 mb-6 text-center">Login</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-900"
          />
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-900"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-900"
          />
          <div>
            <p className="text-red-900 mb-2">Select Role:</p>
            {["student", "teacher", "admin", "accountsadmin"].map((r) => (
              <label key={r} className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="role"
                  value={r}
                  checked={role === r}
                  onChange={() => setRole(r as "student" | "teacher" | "admin" | "accountsadmin")}
                />
                <span>{r.charAt(0).toUpperCase() + r.slice(1)}</span>
              </label>
            ))}
          </div>
          <button
            type="submit"
            className="w-full bg-red-900 text-pink-200 p-3 rounded hover:bg-red-800 transition-colors"
          >
            Login
          </button>
        </form>
        {error && <p className="text-red-900 mt-4 text-center">{error}</p>}
        <p className="text-gray-600 mt-4 text-center">
          If you don’t have an account,{" "}
          <Link href="/auth/register" className="text-red-900 hover:underline">
            register here
          </Link>.
        </p>
      </div>
    </div>
  );
}