"use client";

import { useState, useEffect, FormEvent } from "react";
import { authenticatedFetch } from "@/lib/api";

export interface CourseType {
  id: string;
  title: string;
  description: string;
  price: number;
  isPublished: boolean;
}

export interface AccountType {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  accountType: string;
  organizationName?: string | null;
  organizationType?: string | null;
  isVerified: boolean;
  coursesAssigned: number;
  lessonsCompleted?: number;
  totalLessonsAssigned?: number;
  createdAt: string;
  updatedAt: string;
}

export interface AccountsComponentProps {
  token: string;
  isLoading?: boolean;
}

const generateRandomPassword = (length: number = 12): string => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export default function AccountsComponent({ token, isLoading = false }: AccountsComponentProps) {
  const [accounts, setAccounts] = useState<AccountType[]>([]);
  const [courses, setCourses] = useState<CourseType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState("");
  const [selectedAccountForCourses, setSelectedAccountForCourses] = useState<AccountType | null>(null);
  const [isCoursesModalOpen, setIsCoursesModalOpen] = useState(false);
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [assigningCourses, setAssigningCourses] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    accountType: "INDIVIDUAL",
    organizationName: "",
    organizationType: "",
    phone: "",
  });

  // Fetch accounts
  useEffect(() => {
    if (!token) return;
    
    const fetchAccounts = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await authenticatedFetch<{ accounts: AccountType[] }>("/api/lms/accounts", { token });
        if (response.ok && response.data?.accounts) {
          setAccounts(response.data.accounts);
        } else {
          setError(response.error || "Failed to load accounts");
        }
      } catch (err) {
        setError("Network error while loading accounts");
      } finally {
        setLoading(false);
      }
    };

    fetchAccounts();
  }, [token]);

  // Fetch courses
  useEffect(() => {
    if (!token) return;

    const fetchCourses = async () => {
      try {
        const response = await authenticatedFetch<{ courses: CourseType[] }>("/api/lms/courses", { token });
        if (response.ok && response.data?.courses) {
          setCourses(response.data.courses);
        }
      } catch (err) {
        // Silent failure for courses - not critical
      }
    };

    fetchCourses();
  }, [token]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleGeneratePassword = () => {
    const pwd = generateRandomPassword();
    setGeneratedPassword(pwd);
    setFormData((prev) => ({
      ...prev,
      password: pwd,
    }));
    setShowPassword(true);
  };

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(generatedPassword);
    setCopyFeedback("Copied!");
    setTimeout(() => setCopyFeedback(""), 2000);
  };

  const handleOpenModal = () => {
    setFormData({
      name: "",
      email: "",
      password: "",
      accountType: "INDIVIDUAL",
      organizationName: "",
      organizationType: "",
      phone: "",
    });
    setGeneratedPassword("");
    setShowPassword(false);
    setIsModalOpen(true);
    setError("");
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;

    if (!formData.name || !formData.email || !formData.password) {
      setError("Name, email, and password are required");
      return;
    }

    if (formData.accountType === "SCHOOL" && !formData.organizationName) {
      setError("Organization name is required for school accounts");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response = await authenticatedFetch<{ account: AccountType }>("/api/lms/accounts", {
        method: "POST",
        token,
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
          accountType: formData.accountType,
          organizationName: formData.organizationName || null,
          organizationType: formData.organizationType || null,
          phone: formData.phone || null,
        }),
      });

      if (response.ok && response.data?.account) {
        setAccounts((prev) => [response.data!.account, ...prev]);
        setIsModalOpen(false);
        setFormData({
          name: "",
          email: "",
          password: "",
          accountType: "INDIVIDUAL",
          organizationName: "",
          organizationType: "",
          phone: "",
        });
        setGeneratedPassword("");
      } else {
        setError(response.error || "Failed to create account");
      }
    } catch (err) {
      setError("Network error while creating account");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenCoursesModal = async (account: AccountType) => {
    setSelectedAccountForCourses(account);
    setSelectedCourseIds([]);
    setIsCoursesModalOpen(true);
    setError("");
  };

  const handleAssignCourses = async () => {
    if (!selectedAccountForCourses || selectedCourseIds.length === 0) {
      setError("Please select at least one course");
      return;
    }

    setAssigningCourses(true);
    setError("");

    try {
      const response = await authenticatedFetch<{ message: string }>(`/api/lms/accounts/${selectedAccountForCourses.id}/assign-courses`, {
        method: "POST",
        token,
        body: JSON.stringify({ courseIds: selectedCourseIds }),
      });

      if (response.ok) {
        // Update the account's coursesAssigned count
        setAccounts((prev) =>
          prev.map((acc) =>
            acc.id === selectedAccountForCourses.id
              ? { ...acc, coursesAssigned: selectedCourseIds.length }
              : acc
          )
        );
        setIsCoursesModalOpen(false);
        setSelectedAccountForCourses(null);
        setSelectedCourseIds([]);
      } else {
        setError(response.error || "Failed to assign courses");
      }
    } catch (err) {
      setError("Network error while assigning courses");
    } finally {
      setAssigningCourses(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <span className="text-slate-600">Loading accounts...</span>
        </div>
      ) : accounts.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-slate-600">
          No accounts yet. Create one to get started.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Organization</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Courses</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Created</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr key={account.id} className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">{account.name}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{account.email}</td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${
                        account.accountType === "SCHOOL"
                          ? "bg-blue-50 text-blue-700"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {account.accountType}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {account.organizationName || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className="inline-flex rounded-full bg-brand-blue/10 px-2.5 py-1 text-xs font-semibold text-brand-blue">
                      {account.coursesAssigned} courses
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">
                    {new Date(account.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <button
                      type="button"
                      onClick={() => handleOpenCoursesModal(account)}
                      className="text-brand-blue hover:underline font-medium"
                    >
                      Manage Courses
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Courses Modal */}
      {isCoursesModalOpen && selectedAccountForCourses && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">
                Assign Courses to {selectedAccountForCourses.name}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsCoursesModalOpen(false);
                  setSelectedAccountForCourses(null);
                  setSelectedCourseIds([]);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {courses.length === 0 ? (
                <p className="text-slate-600 text-sm">No courses available to assign.</p>
              ) : (
                courses.map((course) => (
                  <label key={course.id} className="flex items-start gap-3 rounded-lg border border-slate-200 p-3 cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={selectedCourseIds.includes(course.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCourseIds((prev) => [...prev, course.id]);
                        } else {
                          setSelectedCourseIds((prev) => prev.filter((id) => id !== course.id));
                        }
                      }}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-slate-900 text-sm">{course.title}</p>
                      <p className="text-xs text-slate-600 mt-1">{course.description}</p>
                      <p className="text-xs font-semibold text-slate-700 mt-2">₹{course.price}</p>
                    </div>
                  </label>
                ))
              )}
            </div>

            <div className="flex gap-3 pt-4 mt-6 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setIsCoursesModalOpen(false);
                  setSelectedAccountForCourses(null);
                  setSelectedCourseIds([]);
                }}
                className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAssignCourses}
                disabled={assigningCourses || selectedCourseIds.length === 0}
                className="flex-1 rounded-lg bg-brand-blue px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {assigningCourses ? "Assigning..." : "Assign Courses"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Account Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Create New Account</h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700">Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Full name"
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-slate-700">Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="email@example.com"
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
                  required
                />
              </div>

              {/* Account Type */}
              <div>
                <label className="block text-sm font-medium text-slate-700">Account Type *</label>
                <select
                  name="accountType"
                  value={formData.accountType}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
                >
                  <option value="INDIVIDUAL">Individual Student</option>
                  <option value="SCHOOL">School / Organization</option>
                </select>
              </div>

              {/* Organization Name (School only) */}
              {formData.accountType === "SCHOOL" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Organization Name *</label>
                    <input
                      type="text"
                      name="organizationName"
                      value={formData.organizationName}
                      onChange={handleInputChange}
                      placeholder="School or organization name"
                      className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700">Organization Type</label>
                    <select
                      name="organizationType"
                      value={formData.organizationType}
                      onChange={handleInputChange}
                      className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
                    >
                      <option value="">Select type...</option>
                      <option value="JNV">JNV</option>
                      <option value="PMSHRI">PMSHRI</option>
                      <option value="GOVERNMENT">Government</option>
                      <option value="PRIVATE">Private</option>
                    </select>
                  </div>
                </>
              )}

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-slate-700">Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="+91..."
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
                />
              </div>

              {/* Password */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="block text-sm font-medium text-slate-700">Password *</label>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="text-xs text-brand-blue hover:underline"
                  >
                    Generate Random
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Password"
                    className="block flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
                    required
                  />
                  {generatedPassword && (
                    <button
                      type="button"
                      onClick={handleCopyPassword}
                      className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200"
                    >
                      {copyFeedback || "Copy"}
                    </button>
                  )}
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-lg bg-brand-blue px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  {submitting ? "Creating..." : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Button */}
      <div className="mt-4">
        <button
          type="button"
          onClick={handleOpenModal}
          className="inline-flex items-center gap-1.5 rounded-xl bg-brand-blue px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
        >
          <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
            <path d="M10 4.5v11M4.5 10h11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          Create Account
        </button>
      </div>
    </div>
  );
}
