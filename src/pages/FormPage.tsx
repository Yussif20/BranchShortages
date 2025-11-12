import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { databases, DATABASE_ID, COLLECTION_ID } from "../lib/appwrite";
import type { FormRow, FormData, DailyForm } from "../types";
import { ID, Query } from "appwrite";
import jsPDF from "jspdf";

const BRANCHES = [
  "مكة-العتيبية",
  "مكة-الشوقية",
  "مكة-النورية",
  "مكة-الزايدي",
  "مكة-الشرائع",
  "جدة-المنار",
  "جدة-النسيم",
];

const DEPARTMENTS = [
  "مواد غذائية",
  "منظفات",
  "استهلاكية",
  "عناية شخصية",
  "العاب",
  "مكتبية",
  "مستحضرات تجميل",
  "اكسسوارات",
  "ملابس",
  "عطور",
  "منزلية",
];

const PACKING_OPTIONS = ["حبة", "كرتون", "شد"];

const WHATSAPP_CONTACTS = [
  { name: "محمد عبدالله", number: "966580629839" },
  { name: "بلال احمد", number: "966544000185" },
  { name: "جلال العيسائي", number: "966534300055" },
  { name: "غسان سروري", number: "966506248310" },
];

const FormPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    branchName: "",
    department: "",
    enteredBy: "",
    date: new Date().toISOString().split("T")[0],
    rows: Array.from({ length: 30 }, (_, i) => ({
      sequence: i + 1,
      item: "",
      barcode: "",
      quantity: "",
      size: "",
      packing: "",
      company: "",
      altCompany: "",
      notes: "",
    })),
  });
  const [draftId, setDraftId] = useState<string | null>(null);

  const loadDraft = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_ID,
        [
          Query.equal("userId", user.$id),
          Query.orderDesc("$updatedAt"),
          Query.limit(1),
        ]
      );

      if (response.documents.length > 0) {
        const draft = response.documents[0] as unknown as DailyForm;
        setDraftId(draft.$id || null);

        // Parse rows from JSON string if needed
        let rows = draft.rows;
        if (typeof rows === "string") {
          rows = JSON.parse(rows);
        }

        setFormData({
          branchName: draft.branchName || "",
          department: draft.department || "",
          enteredBy: draft.enteredBy || "",
          date: draft.date || new Date().toISOString().split("T")[0],
          rows:
            rows ||
            Array.from({ length: 30 }, (_, i) => ({
              sequence: i + 1,
              item: "",
              barcode: "",
              quantity: "",
              size: "",
              packing: "",
              company: "",
              altCompany: "",
              notes: "",
            })),
        });
      }
    } catch (error) {
      console.error("Error loading draft:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const saveDraft = useCallback(async () => {
    if (!user) return;

    setSaving(true);
    try {
      const dataToSave = {
        userId: user.$id,
        branchName: formData.branchName,
        department: formData.department,
        enteredBy: formData.enteredBy,
        date: formData.date,
        rows: JSON.stringify(formData.rows),
      };

      if (draftId) {
        await databases.updateDocument(
          DATABASE_ID,
          COLLECTION_ID,
          draftId,
          dataToSave
        );
      } else {
        const doc = await databases.createDocument(
          DATABASE_ID,
          COLLECTION_ID,
          ID.unique(),
          dataToSave
        );
        setDraftId(doc.$id);
      }
    } catch (error) {
      console.error("Error saving draft:", error);
    } finally {
      setSaving(false);
    }
  }, [user, formData, draftId]);

  useEffect(() => {
    loadDraft();
  }, [loadDraft]);

  // Auto-save every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (formData.branchName || formData.enteredBy) {
        saveDraft();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [formData.branchName, formData.enteredBy, saveDraft]);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const handleHeaderChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleRowChange = (
    index: number,
    field: keyof FormRow,
    value: string
  ) => {
    setFormData((prev) => {
      const newRows = [...prev.rows];
      newRows[index] = { ...newRows[index], [field]: value };
      return { ...prev, rows: newRows };
    });
  };

  const addRow = () => {
    setFormData((prev) => ({
      ...prev,
      rows: [
        ...prev.rows,
        {
          sequence: prev.rows.length + 1,
          item: "",
          barcode: "",
          quantity: "",
          size: "",
          packing: "",
          company: "",
          altCompany: "",
          notes: "",
        },
      ],
    }));
  };

  const removeRow = (index: number) => {
    if (formData.rows.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      rows: prev.rows
        .filter((_, i) => i !== index)
        .map((row, i) => ({ ...row, sequence: i + 1 })),
    }));
  };

  const generatePDF = async () => {
    // Create a hidden div with the content
    const pdfContent = document.createElement("div");
    pdfContent.style.position = "absolute";
    pdfContent.style.left = "-9999px";
    pdfContent.style.width = "297mm"; // A4 landscape width
    pdfContent.style.padding = "20mm";
    pdfContent.style.fontFamily = "Cairo, Arial, sans-serif";
    pdfContent.style.direction = "rtl";
    pdfContent.style.backgroundColor = "white";

    // Filter rows with data
    const filledRows = formData.rows.filter(
      (row) => row.item || row.barcode || row.quantity
    );

    pdfContent.innerHTML = `
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="font-size: 24px; font-weight: bold; color: #1a202c;">تقرير نواقص الفرع اليومية</h1>
      </div>

      <div style="margin-bottom: 20px; font-size: 14px;">
        <p style="margin: 5px 0;"><strong>اسم الفرع:</strong> ${
          formData.branchName
        }</p>
        <p style="margin: 5px 0;"><strong>القسم:</strong> ${
          formData.department
        }</p>
        <p style="margin: 5px 0;"><strong>اسم المدخل:</strong> ${
          formData.enteredBy
        }</p>
        <p style="margin: 5px 0;"><strong>التاريخ:</strong> ${formData.date}</p>
      </div>

      <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
        <thead>
          <tr style="background-color: #428bca; color: white;">
            <th style="border: 1px solid #ddd; padding: 6px; text-align: center;">تسلسل</th>
            <th style="border: 1px solid #ddd; padding: 6px; text-align: center;">الصنف</th>
            <th style="border: 1px solid #ddd; padding: 6px; text-align: center;">الباركود</th>
            <th style="border: 1px solid #ddd; padding: 6px; text-align: center;">الكمية</th>
            <th style="border: 1px solid #ddd; padding: 6px; text-align: center;">المقاس/الحجم</th>
            <th style="border: 1px solid #ddd; padding: 6px; text-align: center;">التعبئة</th>
            <th style="border: 1px solid #ddd; padding: 6px; text-align: center;">اسم الشركة</th>
            <th style="border: 1px solid #ddd; padding: 6px; text-align: center;">الشركة البديلة</th>
            <th style="border: 1px solid #ddd; padding: 6px; text-align: center;">ملاحظات</th>
          </tr>
        </thead>
        <tbody>
          ${filledRows
            .map(
              (row) => `
            <tr>
              <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${row.sequence}</td>
              <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${row.item}</td>
              <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${row.barcode}</td>
              <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${row.quantity}</td>
              <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${row.size}</td>
              <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${row.packing}</td>
              <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${row.company}</td>
              <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${row.altCompany}</td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${row.notes}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    `;

    document.body.appendChild(pdfContent);

    // Use html2canvas to capture the content
    const html2canvas = (await import("html2canvas")).default;
    const canvas = await html2canvas(pdfContent, {
      scale: 2,
      logging: false,
      useCORS: true,
    });

    // Remove the temporary element
    document.body.removeChild(pdfContent);

    // Create PDF from canvas
    const imgData = canvas.toDataURL("image/png");
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    const imgWidth = 297; // A4 landscape width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    doc.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);

    // Save PDF
    const fileName = `نواقص_${formData.branchName}_${formData.date}.pdf`;
    doc.save(fileName);

    return doc.output("blob");
  };

  const handleWhatsAppShare = async (contactNumber: string) => {
    await saveDraft();
    await generatePDF();

    const message = encodeURIComponent(
      `تقرير نواقص الفرع\nالفرع: ${formData.branchName}\nالتاريخ: ${formData.date}\n\nيرجى الاطلاع على الملف المرفق.`
    );

    const whatsappUrl = `https://wa.me/${contactNumber}?text=${message}`;
    window.open(whatsappUrl, "_blank");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <div className="text-lg">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Logo" className="h-10 w-10" />
              <h1 className="text-2xl font-bold text-gray-900">
                نظام تسجيل نواقص الفروع
              </h1>
            </div>
            <div className="flex items-center gap-4">
              {saving && (
                <span className="text-sm text-gray-500">جاري الحفظ...</span>
              )}
              <span className="text-sm text-gray-600">
                مرحباً، {user?.name}
              </span>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 text-sm"
              >
                تسجيل الخروج
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg p-6">
          {/* Header Section */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                اسم الفرع <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.branchName}
                onChange={(e) =>
                  handleHeaderChange("branchName", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">اختر الفرع</option>
                {BRANCHES.map((branch) => (
                  <option key={branch} value={branch}>
                    {branch}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                القسم <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.department}
                onChange={(e) =>
                  handleHeaderChange("department", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">اختر القسم</option>
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                اسم المدخل
              </label>
              <input
                type="text"
                value={formData.enteredBy}
                onChange={(e) =>
                  handleHeaderChange("enteredBy", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="أدخل الاسم"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                التاريخ <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.date}
                max={new Date().toISOString().split("T")[0]}
                onChange={(e) => handleHeaderChange("date", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                    تسلسل
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                    الصنف
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                    الباركود
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                    الكمية
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                    المقاس/الحجم
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                    التعبئة
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                    اسم الشركة
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                    الشركة البديلة
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                    ملاحظات
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                    إجراء
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {formData.rows.map((row, index) => (
                  <tr key={index}>
                    <td className="px-3 py-2 text-center text-sm text-gray-900">
                      {row.sequence}
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={row.item}
                        onChange={(e) =>
                          handleRowChange(index, "item", e.target.value)
                        }
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={row.barcode}
                        onChange={(e) =>
                          handleRowChange(index, "barcode", e.target.value)
                        }
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={row.quantity}
                        onChange={(e) =>
                          handleRowChange(index, "quantity", e.target.value)
                        }
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={row.size}
                        onChange={(e) =>
                          handleRowChange(index, "size", e.target.value)
                        }
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={row.packing}
                        onChange={(e) =>
                          handleRowChange(index, "packing", e.target.value)
                        }
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">اختر</option>
                        {PACKING_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={row.company}
                        onChange={(e) =>
                          handleRowChange(index, "company", e.target.value)
                        }
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={row.altCompany}
                        onChange={(e) =>
                          handleRowChange(index, "altCompany", e.target.value)
                        }
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={row.notes}
                        onChange={(e) =>
                          handleRowChange(index, "notes", e.target.value)
                        }
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => removeRow(index)}
                        disabled={formData.rows.length <= 1}
                        className="text-red-600 hover:text-red-900 disabled:opacity-30 disabled:cursor-not-allowed text-sm"
                      >
                        حذف
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add Row Button */}
          <div className="mt-4">
            <button
              onClick={addRow}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 text-sm"
            >
              + إضافة صف
            </button>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex flex-wrap gap-4 justify-center">
            <button
              onClick={saveDraft}
              disabled={saving}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "جاري الحفظ..." : "حفظ كمسودة"}
            </button>
            <button
              onClick={generatePDF}
              className="bg-purple-600 text-white px-6 py-2 rounded-md hover:bg-purple-700"
            >
              تحميل PDF
            </button>
            <div className="flex gap-2 items-center">
              <select
                id="whatsapp-contact"
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">اختر جهة الاتصال</option>
                {WHATSAPP_CONTACTS.map((contact) => (
                  <option key={contact.number} value={contact.number}>
                    {contact.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => {
                  const select = document.getElementById(
                    "whatsapp-contact"
                  ) as HTMLSelectElement;
                  const number = select.value;
                  if (number) {
                    handleWhatsAppShare(number);
                  } else {
                    alert("يرجى اختيار جهة اتصال");
                  }
                }}
                className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 whitespace-nowrap"
              >
                إرسال عبر واتساب
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormPage;
