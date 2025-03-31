"use client";

import { useEffect, useState } from "react";
import { auth, db } from "../../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, updateDoc, collection, getDocs } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import CheckoutPage from "../../components/CheckoutPage";
import { useAuth } from "../../contexts/AuthContext";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function Dashboard() {
  const [student, setStudent] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>("");
  const [username, setUsername] = useState("");
  const [greeting, setGreeting] = useState("");
  const [allStudents, setAllStudents] = useState<any[]>([]);
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
        const userData = userDoc.data();
        console.log("User Data:", userData);

        if (userData) {
          setUserRole(userData.role);
          setUsername(userData.name || "Unnamed");
          const hour = new Date().getHours();
          if (hour < 12) setGreeting("Good Morning");
          else if (hour < 18) setGreeting("Good Afternoon");
          else setGreeting("Good Night");
        }

        if (userData?.role === "student") {
          const studentDoc = doc(db, "students", currentUser.uid);
          const studentSnap = await getDoc(studentDoc);
          const studentData = studentSnap.data();
          console.log("Student Data:", studentData);
          if (studentData) setStudent(studentData);
        }

        if (["teacher", "admin", "accountsadmin"].includes(userData?.role)) {
          const studentsSnapshot = await getDocs(collection(db, "students"));
          const studentsList = studentsSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setAllStudents(studentsList);
          console.log("All Students:", studentsList);
        }
      } else {
        router.push("/auth/login");
      }
    });
    return () => unsubscribe();
  }, [user, router]);

  const calculateCourseAverage = (subjects: any[]) => {
    const validGrades = (subjects || [])
      .map((s) => parseFloat(s.grades?.final || "0"))
      .filter((g) => !isNaN(g));
    return validGrades.length > 0 ? (validGrades.reduce((sum, g) => sum + g, 0) / validGrades.length).toFixed(2) : "N/A";
  };

  const handleGradeUpdate = (studentId: string, courseName: string, subjectName: string, field: string, value: string, updateNow: boolean = false) => {
    if (userRole !== "teacher") return;

    setAllStudents((prev) => {
      const updatedStudents = prev.map((s) => {
        if (s.id === studentId) {
          const updatedCourses = s.courses.map((c: any) => {
            if (c.name === courseName) {
              const updatedSubjects = c.subjects.map((sub: any) => {
                if (sub.name === subjectName) {
                  const updatedGrades = { ...sub.grades, [field]: value };
                  if (["C1", "C2", "exam"].includes(field) || field.startsWith("C")) {
                    const classworkKeys = Object.keys(updatedGrades).filter(k => k.startsWith("C"));
                    const classworkValues = classworkKeys
                      .map(k => parseFloat(updatedGrades[k] || "0"))
                      .filter(v => !isNaN(v));
                    const exam = parseFloat(updatedGrades.exam || "0");
                    if (classworkValues.length > 0 && !isNaN(exam)) {
                      const classworkAvg = classworkValues.reduce((sum, v) => sum + v, 0) / classworkValues.length;
                      updatedGrades.final = (classworkAvg * 0.4 + exam * 0.6).toFixed(2);
                    }
                  }
                  return { ...sub, grades: updatedGrades };
                }
                return sub;
              });
              return { ...c, subjects: updatedSubjects };
            }
            return c;
          });
          return { ...s, courses: updatedCourses };
        }
        return s;
      });

      if (updateNow) {
        const studentDoc = doc(db, "students", studentId);
        const studentToUpdate = updatedStudents.find(s => s.id === studentId);
        updateDoc(studentDoc, { courses: studentToUpdate.courses })
          .then(() => console.log("Firestore updated for:", studentId))
          .catch((err) => console.error("Update failed:", err));
      }

      return updatedStudents;
    });
  };

  const addClassworkField = (studentId: string, courseName: string, subjectName: string) => {
    setAllStudents((prev) => {
      return prev.map((s) => {
        if (s.id === studentId) {
          const updatedCourses = s.courses.map((c: any) => {
            if (c.name === courseName) {
              const updatedSubjects = c.subjects.map((sub: any) => {
                if (sub.name === subjectName) {
                  const currentFields = Object.keys(sub.grades || {}).filter(k => k.startsWith("C"));
                  const nextNum = currentFields.length + 1;
                  return { ...sub, grades: { ...sub.grades, [`C${nextNum}`]: "" } };
                }
                return sub;
              });
              return { ...c, subjects: updatedSubjects };
            }
            return c;
          });
          return { ...s, courses: updatedCourses };
        }
        return s;
      });
    });
  };

  const handleUpdateStudent = (studentId: string) => {
    const studentToUpdate = allStudents.find(s => s.id === studentId);
    if (!studentToUpdate) return;
    const studentDoc = doc(db, "students", studentId);
    updateDoc(studentDoc, { courses: studentToUpdate.courses })
      .then(() => {
        console.log("Grades updated for:", studentId);
        alert("Grades updated successfully!");
      })
      .catch((err) => {
        console.error("Update failed:", err);
        alert("Failed to update grades: " + err.message);
      });
  };

  const handleGrantClearance = async (studentId: string) => {
    if (!["admin", "accountsadmin"].includes(userRole)) return;
    const studentDoc = doc(db, "students", studentId);
    await updateDoc(studentDoc, { clearance: true });
    setAllStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, clearance: true } : s))
    );
  };

  const handleRemoveClearance = async (studentId: string) => {
    if (!["admin", "accountsadmin"].includes(userRole)) return;
    const studentDoc = doc(db, "students", studentId);
    await updateDoc(studentDoc, { clearance: false });
    setAllStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, clearance: false } : s))
    );
  };

  const handlePaymentSuccess = () => {
    console.log("Payment succeeded, refreshing page...");
    window.location.reload();
  };

  const getMaxClassworkFields = (subjects: any[]) => {
    return subjects.reduce((maxFields, sub) => {
      const classworkKeys = Object.keys(sub.grades || {}).filter(k => k.startsWith("C"));
      return Math.max(maxFields, classworkKeys.length);
    }, 2);
  };

  const downloadGradesAsPDF = () => {
    const doc = new jsPDF();
    autoTable(doc, {});

    doc.setFontSize(16);
    doc.text(`${userRole === "student" ? "Your" : "Student"} Grades Report`, 20, 20);

    if (userRole === "student" && student && Array.isArray(student.courses) && student.courses.length > 0) {
      let yOffset = 30;
      doc.setFontSize(12);
      student.courses.forEach((course: any) => {
        doc.text(`Course: ${course.name || "Unknown Course"}`, 20, yOffset);
        yOffset += 10;

        const headers = ["Subject", "Classwork", "Exam", "Final", "Status"];
        const data = (course.subjects && Array.isArray(course.subjects) ? course.subjects : []).map((sub: any) => {
          const classwork = Object.keys(sub?.grades || {})
            .filter(k => k.startsWith("C"))
            .map(k => sub.grades[k] || "N/A")
            .join(", ");
          return [
            sub?.name || "Unknown",
            classwork || "N/A",
            sub?.grades?.exam || "N/A",
            sub?.grades?.final || "N/A",
            sub?.grades?.status || "Pending",
          ];
        });

        autoTable(doc, {
          head: [headers],
          body: data,
          startY: yOffset,
          styles: { fontSize: 10, cellPadding: 2 },
          headStyles: { fillColor: [127, 29, 29] },
        });

        yOffset = (doc as any).lastAutoTable.finalY + 10;
        doc.text(`Course Average: ${calculateCourseAverage(course.subjects || [])}`, 20, yOffset);
        yOffset += 10;
      });

      doc.save(`${username}_Grades.pdf`);
    } else if (["teacher", "admin", "accountsadmin"].includes(userRole) && Array.isArray(allStudents) && allStudents.length > 0) {
      let yOffset = 30;
      doc.setFontSize(12);
      allStudents.forEach((s) => {
        doc.text(`Student: ${s.name || "Unnamed"}`, 20, yOffset);
        yOffset += 10;

        if (Array.isArray(s.courses) && s.courses.length > 0) {
          s.courses.forEach((course: any) => {
            doc.text(`Course: ${course.name || "Unknown Course"}`, 20, yOffset);
            yOffset += 10;

            const headers = ["Subject", "Classwork", "Exam", "Final", "Status"];
            const data = (course.subjects && Array.isArray(course.subjects) ? course.subjects : []).map((sub: any) => {
              const classwork = Object.keys(sub?.grades || {})
                .filter(k => k.startsWith("C"))
                .map(k => sub.grades[k] || "N/A")
                .join(", ");
              return [
                sub?.name || "Unknown",
                classwork || "N/A",
                sub?.grades?.exam || "N/A",
                sub?.grades?.final || "N/A",
                sub?.grades?.status || "Pending",
              ];
            });

            autoTable(doc, {
              head: [headers],
              body: data,
              startY: yOffset,
              styles: { fontSize: 10, cellPadding: 2 },
              headStyles: { fillColor: [127, 29, 29] },
            });

            yOffset = (doc as any).lastAutoTable.finalY + 10;
            doc.text(`Course Average: ${calculateCourseAverage(course.subjects || [])}`, 20, yOffset);
            yOffset += 10;
          });
        } else {
          doc.text("No courses available.", 20, yOffset);
          yOffset += 10;
        }
      });

      doc.save("All_Students_Grades.pdf");
    } else {
      alert("No grades available to download.");
    }
  };

  if (!userRole) return <p style={{ textAlign: "center", color: "#7F1D1D" }}>Loading...</p>;

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
            <li style={{ marginBottom: "0.5rem" }}>
              <Link href="/dashboard/courses" style={{ color: "#7F1D1D", textDecoration: "none", fontWeight: "500" }}>Courses</Link>
            </li>
          )}
          {userRole === "teacher" && (
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
          )}
          {userRole === "admin" && (
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
          )}
          {userRole === "accountsadmin" && (
            <li style={{ marginBottom: "0.5rem" }}>
              <span style={{ color: "#7F1D1D", fontWeight: "500" }}>Management</span>
            </li>
          )}
        </ul>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, padding: "2rem" }}>
        <div style={{ maxWidth: "64rem", margin: "0 auto", backgroundColor: "#FFFFFF", padding: "2rem", borderRadius: "0.5rem", boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)", border: "1px solid #7F1D1D" }}>
          <h2 style={{ fontSize: "1.875rem", fontWeight: "bold", color: "#7F1D1D", marginBottom: "1.5rem" }}>
            {greeting}, {username}
          </h2>

          {/* Download Grades Button */}
          <button
            onClick={downloadGradesAsPDF}
            style={{ marginBottom: "1rem", padding: "0.5rem 1rem", backgroundColor: "#7F1D1D", color: "#FFFFFF", borderRadius: "4px", border: "none", cursor: "pointer" }}
          >
            Download Grades as PDF
          </button>

          {/* Student Dashboard */}
          {userRole === "student" && (
            <>
              {!student ? (
                <p style={{ textAlign: "center", color: "#7F1D1D" }}>Loading student data...</p>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1.5rem" }}>
                  <div>
                    <p style={{ fontSize: "1.125rem", fontWeight: "600", color: "#7F1D1D" }}>Courses:</p>
                    {student.courses?.length > 0 ? (
                      student.courses.map((c: any) => (
                        <div key={c.name}>
                          <p>{c.name} ({c.fee.toLocaleString()} JMD)</p>
                          <ul style={{ color: "#7F1D1D", marginLeft: "1rem" }}>
                            {c.subjects?.map((s: any) => (
                              <li key={s.name}>
                                {s.name}: Final Grade - {s.grades?.final || "Not graded"} ({s.grades?.status || "Pending"})
                              </li>
                            ))}
                          </ul>
                          <p style={{ marginTop: "0.5rem" }}>Course Average: {calculateCourseAverage(c.subjects)}</p>
                        </div>
                      ))
                    ) : (
                      <p>No courses enrolled.</p>
                    )}
                  </div>
                  <div>
                    <p style={{ fontSize: "1.125rem", fontWeight: "600", color: "#7F1D1D" }}>Payment Status:</p>
                    <p style={{ color: student.paymentStatus === "Unpaid" ? "#7F1D1D" : "green" }}>
                      {student.paymentStatus || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: "1.125rem", fontWeight: "600", color: "#7F1D1D" }}>Balance:</p>
                    <p>{student.balance?.toLocaleString() || "0"} JMD</p>
                  </div>
                  <div>
                    <p style={{ fontSize: "1.125rem", fontWeight: "600", color: "#7F1D1D" }}>Payment Plan:</p>
                    <p>{student.paymentPlan?.planType || "N/A"}</p>
                    <ul style={{ color: "#7F1D1D" }}>
                      {student.paymentPlan?.installments?.map((inst: any, idx: number) => (
                        <li key={idx}>
                          {inst.amount.toLocaleString()} JMD due {new Date(inst.dueDate).toLocaleDateString()} - {inst.paid ? "Paid" : "Pending"}
                        </li>
                      )) || <li>No payment plan.</li>}
                    </ul>
                  </div>
                  <div style={{ marginTop: "2rem", gridColumn: "span 1" }}>
                    <h3 style={{ fontSize: "1.5rem", fontWeight: "600", color: "#7F1D1D", marginBottom: "1rem" }}>Pay Tuition</h3>
                    <CheckoutPage onPaymentSuccess={handlePaymentSuccess} />
                  </div>
                </div>
              )}
            </>
          )}

          {/* Teacher Dashboard */}
          {userRole === "teacher" && (
            <div>
              <h3 style={{ fontSize: "1.5rem", fontWeight: "600", color: "#7F1D1D", marginBottom: "1rem" }}>Manage Student Grades</h3>
              {allStudents.length > 0 ? (
                allStudents.map((s) => (
                  <div key={s.id} style={{ marginBottom: "2rem" }}>
                    <p style={{ fontSize: "1.125rem", fontWeight: "600", color: "#7F1D1D", marginBottom: "0.5rem" }}>{s.name || "Unnamed"}</p>
                    {s.courses?.length > 0 ? (
                      s.courses.map((c: any) => (
                        <div key={c.name} style={{ marginBottom: "1rem" }}>
                          <p style={{ color: "#7F1D1D", fontWeight: "600", marginBottom: "0.5rem" }}>{c.name || "Unknown Course"}</p>
                          {c.subjects?.length > 0 ? (
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                              <thead>
                                <tr style={{ backgroundColor: "#7F1D1D", color: "#FFFFFF" }}>
                                  <th>Subject</th>
                                  {Array.from({ length: getMaxClassworkFields(c.subjects) }, (_, i) => (
                                    <th key={`C${i + 1}`}>{`C${i + 1}`}</th>
                                  ))}
                                  <th>Exam</th>
                                  <th>Final</th>
                                  <th>Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {c.subjects.map((sub: any) => (
                                  <tr key={sub.name}>
                                    <td>{sub.name || "Unknown Subject"}</td>
                                    {Array.from({ length: getMaxClassworkFields(c.subjects) }, (_, i) => {
                                      const field = `C${i + 1}`;
                                      return (
                                        <td key={field}>
                                          <input
                                            type="number"
                                            value={sub.grades?.[field] || ""}
                                            onChange={(e) => handleGradeUpdate(s.id, c.name, sub.name, field, e.target.value)}
                                            style={{ width: "100%", padding: "4px", border: "1px solid #7F1D1D", borderRadius: "4px", color: "#7F1D1D" }}
                                            placeholder={field}
                                            min="0"
                                            max="100"
                                          />
                                        </td>
                                      );
                                    })}
                                    <td>
                                      <input
                                        type="number"
                                        value={sub.grades?.exam || ""}
                                        onChange={(e) => handleGradeUpdate(s.id, c.name, sub.name, "exam", e.target.value)}
                                        style={{ width: "100%", padding: "4px", border: "1px solid #7F1D1D", borderRadius: "4px", color: "#7F1D1D" }}
                                        placeholder="Exam"
                                        min="0"
                                        max="100"
                                      />
                                    </td>
                                    <td>
                                      <input
                                        type="text"
                                        value={sub.grades?.final || ""}
                                        style={{ width: "100%", padding: "4px", border: "1px solid #7F1D1D", borderRadius: "4px", backgroundColor: "#E5E7EB", color: "#7F1D1D" }}
                                        readOnly
                                      />
                                    </td>
                                    <td>
                                      <select
                                        value={sub.grades?.status || "Pending"}
                                        onChange={(e) => handleGradeUpdate(s.id, c.name, sub.name, "status", e.target.value)}
                                        style={{ width: "100%", padding: "4px", border: "1px solid #7F1D1D", borderRadius: "4px", color: "#7F1D1D" }}
                                      >
                                        <option value="Pending">Pending</option>
                                        <option value="Ratified">Ratified</option>
                                      </select>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <p style={{ color: "#7F1D1D" }}>No subjects found for this course.</p>
                          )}
                          <p style={{ marginTop: "0.5rem", color: "#7F1D1D" }}>Course Average: {calculateCourseAverage(c.subjects)}</p>
                          <button
                            onClick={() => addClassworkField(s.id, c.name, c.subjects[0]?.name || "Unknown Subject")}
                            style={{ marginTop: "0.5rem", padding: "0.5rem 1rem", backgroundColor: "#7F1D1D", color: "#FFFFFF", borderRadius: "4px", border: "none", cursor: "pointer" }}
                          >
                            Add More Classwork
                          </button>
                        </div>
                      ))
                    ) : (
                      <p style={{ color: "#7F1D1D" }}>No courses found for this student.</p>
                    )}
                    <button
                      onClick={() => handleUpdateStudent(s.id)}
                      style={{ marginTop: "1rem", padding: "0.5rem 1rem", backgroundColor: "#7F1D1D", color: "#FFFFFF", borderRadius: "4px", border: "none", cursor: "pointer" }}
                    >
                      Update Grades
                    </button>
                  </div>
                ))
              ) : (
                <p style={{ color: "#7F1D1D" }}>No students found.</p>
              )}
            </div>
          )}

          {/* Admin/Accountsadmin Dashboard */}
          {["admin", "accountsadmin"].includes(userRole) && (
            <div>
              <h3 style={{ fontSize: "1.5rem", fontWeight: "600", color: "#7F1D1D", marginBottom: "1rem" }}>Manage All Students</h3>
              {allStudents.length > 0 ? (
                allStudents.map((s) => (
                  <div key={s.id} style={{ marginBottom: "1.5rem", border: "1px solid #7F1D1D", padding: "1rem", borderRadius: "4px" }}>
                    <p style={{ fontSize: "1.125rem", fontWeight: "600", color: "#7F1D1D" }}>Student: {s.name}</p>
                    {s.courses?.map((c: any) => (
                      <div key={c.name} style={{ marginTop: "0.5rem" }}>
                        <p style={{ color: "#7F1D1D", fontWeight: "600" }}>{c.name}</p>
                        {c.subjects?.map((sub: any) => (
                          <div key={sub.name} style={{ marginLeft: "1rem" }}>
                            <p>{sub.name}</p>
                            <div style={{ display: "flex", gap: "0.5rem" }}>
                              <input
                                type="text"
                                value={sub.grades?.C1 || ""}
                                onChange={(e) => handleGradeUpdate(s.id, c.name, sub.name, "C1", e.target.value)}
                                style={{ border: "1px solid #7F1D1D", padding: "4px", borderRadius: "4px", width: "4rem", color: "#7F1D1D" }}
                                placeholder="C1"
                              />
                              <input
                                type="text"
                                value={sub.grades?.C2 || ""}
                                onChange={(e) => handleGradeUpdate(s.id, c.name, sub.name, "C2", e.target.value)}
                                style={{ border: "1px solid #7F1D1D", padding: "4px", borderRadius: "4px", width: "4rem", color: "#7F1D1D" }}
                                placeholder="C2"
                              />
                              <input
                                type="text"
                                value={sub.grades?.exam || ""}
                                onChange={(e) => handleGradeUpdate(s.id, c.name, sub.name, "exam", e.target.value)}
                                style={{ border: "1px solid #7F1D1D", padding: "4px", borderRadius: "4px", width: "4rem", color: "#7F1D1D" }}
                                placeholder="Exam"
                              />
                              <input
                                type="text"
                                value={sub.grades?.final || ""}
                                onChange={(e) => handleGradeUpdate(s.id, c.name, sub.name, "final", e.target.value)}
                                style={{ border: "1px solid #7F1D1D", padding: "4px", borderRadius: "4px", width: "4rem", color: "#7F1D1D" }}
                                placeholder="Final"
                              />
                              <select
                                value={sub.grades?.status || "Pending"}
                                onChange={(e) => handleGradeUpdate(s.id, c.name, sub.name, "status", e.target.value)}
                                style={{ border: "1px solid #7F1D1D", padding: "4px", borderRadius: "4px", color: "#7F1D1D" }}
                              >
                                <option value="Pending">Pending</option>
                                <option value="Ratified">Ratified</option>
                              </select>
                            </div>
                          </div>
                        ))}
                        <p style={{ marginTop: "0.5rem", color: "#7F1D1D" }}>Course Average: {calculateCourseAverage(c.subjects)}</p>
                      </div>
                    ))}
                    <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.5rem" }}>
                      <button
                        onClick={() => handleGrantClearance(s.id)}
                        style={{ padding: "0.25rem 0.5rem", backgroundColor: "#7F1D1D", color: "#FFFFFF", borderRadius: "4px", border: "none", cursor: "pointer" }}
                      >
                        Grant Clearance
                      </button>
                      <button
                        onClick={() => handleRemoveClearance(s.id)}
                        style={{ padding: "0.25rem 0.5rem", backgroundColor: "#7F1D1D", color: "#FFFFFF", borderRadius: "4px", border: "none", cursor: "pointer" }}
                      >
                        Remove Clearance
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ color: "#7F1D1D" }}>No students found.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}