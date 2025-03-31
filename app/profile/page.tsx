"use client";

import { useEffect, useState } from "react";
import { auth, db } from "../../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../contexts/AuthContext";

export default function Profile() {
  const [userData, setUserData] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>("");
  const [isCoursesOpen, setIsCoursesOpen] = useState(false);
  const [isStudentsOpen, setIsStudentsOpen] = useState(false);
  const [isManagementOpen, setIsManagementOpen] = useState(false);
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      router.push("/auth/login");
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        const data = userDoc.data();
        if (data) {
          setUserData(data);
          setUserRole(data.role);
        }
      } else {
        router.push("/auth/login");
      }
    });
    return () => unsubscribe();
  }, [user, router]);

  if (!userData) return <p style={{ textAlign: "center", color: "#7F1D1D" }}>Loading...</p>;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#FFFFFF", display: "flex" }}>
      {/* Sidebar */}
      <div style={{ width: "250px", backgroundColor: "#f0f0f0", padding: "1rem", borderRight: "1px solid #7F1D1D" }}>
        <h3 style={{ color: "#7F1D1D", fontSize: "1.25rem", fontWeight: "600", marginBottom: "1rem" }}>ISMIS Menu</h3>
        <ul style={{ listStyle: "none", padding: 0 }}>
          <li style={{ marginBottom: "0.5rem" }}>
            <Link href="/dashboard" style={{ color: "#7F1D1D", textDecoration: "none", fontWeight: "500" }}>Dashboard</Link>
          </li>
          <li style={{ marginBottom: "0.5rem" }}>
            <Link href="/profile" style={{ color: "#7F1D1D", textDecoration: "none", fontWeight: "500" }}>Profile</Link>
          </li>
          {userRole === "student" && (
            <>
              <li style={{ marginBottom: "0.5rem" }}>
                <button
                  onClick={() => setIsCoursesOpen(!isCoursesOpen)}
                  style={{ color: "#7F1D1D", fontWeight: "500", background: "none", border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", width: "100%" }}
                >
                  <span>Courses</span>
                  <span>{isCoursesOpen ? "▲" : "▼"}</span>
                </button>
                {isCoursesOpen && (
                  <ul style={{ listStyle: "none", paddingLeft: "1rem", marginTop: "0.25rem" }}>
                    <li><Link href="/dashboard/courses/grades" style={{ color: "#7F1D1D", textDecoration: "none" }}>View Grades</Link></li>
                    <li><Link href="/dashboard/courses/details" style={{ color: "#7F1D1D", textDecoration: "none" }}>Course Details</Link></li>
                  </ul>
                )}
              </li>
              <li style={{ marginBottom: "0.5rem" }}>
                <Link href="/dashboard/payments" style={{ color: "#7F1D1D", textDecoration: "none", fontWeight: "500" }}>Payments</Link>
              </li>
            </>
          )}
          {userRole === "teacher" && (
            <>
              <li style={{ marginBottom: "0.5rem" }}>
                <button
                  onClick={() => setIsStudentsOpen(!isStudentsOpen)}
                  style={{ color: "#7F1D1D", fontWeight: "500", background: "none", border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", width: "100%" }}
                >
                  <span>Students</span>
                  <span>{isStudentsOpen ? "▲" : "▼"}</span>
                </button>
                {isStudentsOpen && (
                  <ul style={{ listStyle: "none", paddingLeft: "1rem", marginTop: "0.25rem" }}>
                    <li><Link href="/dashboard/students/grades" style={{ color: "#7F1D1D", textDecoration: "none" }}>Manage Grades</Link></li>
                    <li><Link href="/dashboard/students/reports" style={{ color: "#7F1D1D", textDecoration: "none" }}>View Reports</Link></li>
                  </ul>
                )}
              </li>
            </>
          )}
          {["admin", "accountsadmin"].includes(userRole) && (
            <>
              <li style={{ marginBottom: "0.5rem" }}>
                <button
                  onClick={() => setIsManagementOpen(!isManagementOpen)}
                  style={{ color: "#7F1D1D", fontWeight: "500", background: "none", border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", width: "100%" }}
                >
                  <span>Management</span>
                  <span>{isManagementOpen ? "▲" : "▼"}</span>
                </button>
                {isManagementOpen && (
                  <ul style={{ listStyle: "none", paddingLeft: "1rem", marginTop: "0.25rem" }}>
                    <li><Link href="/dashboard/management/clearance" style={{ color: "#7F1D1D", textDecoration: "none" }}>Clearance</Link></li>
                    <li><Link href="/dashboard/management/reports" style={{ color: "#7F1D1D", textDecoration: "none" }}>Reports</Link></li>
                  </ul>
                )}
              </li>
            </>
          )}
        </ul>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, padding: "2rem" }}>
        <div style={{ maxWidth: "64rem", margin: "0 auto", backgroundColor: "#FFFFFF", padding: "2rem", borderRadius: "0.5rem", boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)", border: "1px solid #7F1D1D" }}>
          <h2 style={{ fontSize: "1.875rem", fontWeight: "bold", color: "#7F1D1D", marginBottom: "1.5rem" }}>
            Profile
          </h2>
          <div style={{ display: "grid", gap: "1rem" }}>
            <p style={{ color: "#7F1D1D" }}><strong>Name:</strong> {userData.name || "Unnamed"}</p>
            <p style={{ color: "#7F1D1D" }}><strong>Email:</strong> {userData.email || "N/A"}</p>
            <p style={{ color: "#7F1D1D" }}><strong>Role:</strong> {userData.role || "N/A"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}