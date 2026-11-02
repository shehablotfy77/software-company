import API_BASE_URL from "../api";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminDashboard.css";
import { useToast } from "../context/ToastContext";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import * as XLSX from "xlsx";

const API_URL = `${API_BASE_URL}/leads`;
const PROJECTS_API_URL = `${API_BASE_URL}/projects`;

const STATUSES = [
  "New",
  "Contacted",
  "Interested",
  "In Progress",
  "Won",
  "Lost",
];

function getWhatsAppNumber(phone) {
  const digits = String(phone || "").replace(/\D/g, "");

  if (digits.startsWith("20")) return digits;

  if (digits.startsWith("0") && digits.length === 11) {
    return `20${digits.slice(1)}`;
  }

  return digits;
}

function AdminDashboard() {
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [currentPage, setCurrentPage] = useState(1);
  const leadsPerPage = 10;
  const [leads, setLeads] = useState([]);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");

  // Projects
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState("");
  const [projectSearch, setProjectSearch] = useState("");
  const [projectStatusFilter, setProjectStatusFilter] = useState("All");

  const [selectedProject, setSelectedProject] = useState(null);
  const [viewingProject, setViewingProject] = useState(null);
  const [isEditingProject, setIsEditingProject] = useState(false);
  const [projectEditForm, setProjectEditForm] = useState({});
  const [savingProject, setSavingProject] = useState(false);
  const [deletingProjectIds, setDeletingProjectIds] = useState([]);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const filteredProjects = useMemo(() => {
    const term = projectSearch.trim().toLowerCase();

    return projects.filter((project) => {
      const matchesSearch = [
        project.projectName,
        project.lead?.name,
        project.assignedTo,
      ].some((value) =>
        String(value || "").toLowerCase().includes(term)
      );

      const matchesStatus =
        projectStatusFilter === "All" ||
        project.status === projectStatusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [projects, projectSearch, projectStatusFilter]);

  // Convert Lead to Project
  const [isReviewingLead, setIsReviewingLead] = useState(false);
  const [isConvertingLead, setIsConvertingLead] = useState(false);
  const [convertingLead, setConvertingLead] = useState(null);
  const [conversionForm, setConversionForm] = useState({
    projectName: "",
    contractValue: "",
    paidAmount: 0,
    startDate: "",
    deadline: "",
    assignedTo: "",
    description: "",
  });
  const [savingConversion, setSavingConversion] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingLeadIds, setUpdatingLeadIds] = useState([]);
  const [deletingLeadIds, setDeletingLeadIds] = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);
  const [isEditingLead, setIsEditingLead] = useState(false);
  const [editForm, setEditForm] = useState({});

  const [followUpNote, setFollowUpNote] = useState("");
  const [followUpOutcome, setFollowUpOutcome] = useState("Spoke to Client");
  const [contactedAt, setContactedAt] = useState(
    new Date().toISOString().slice(0, 16)
  );
  const [nextFollowUpAt, setNextFollowUpAt] = useState("");
  const [savingFollowUp, setSavingFollowUp] = useState(false);
  const [completingFollowUpIds, setCompletingFollowUpIds] = useState([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [serviceFilter, setServiceFilter] = useState("All");
  const [theme, setTheme] = useState(
    () => localStorage.getItem("softcompany-admin-theme") || "dark"
  );

  const token = sessionStorage.getItem("adminToken");
  const adminInfo = JSON.parse(
    sessionStorage.getItem("adminInfo") || "{}"
  );

  useEffect(() => {
    localStorage.setItem("softcompany-admin-theme", theme);
  }, [theme]);

  async function apiRequest(url, options = {}) {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (response.status === 401) {
      sessionStorage.removeItem("adminToken");
      sessionStorage.removeItem("adminInfo");
      navigate("/login", { replace: true });
      throw new Error("انتهت جلسة الدخول. سجل دخولك مرة أخرى.");
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || "حصل خطأ أثناء الاتصال بالسيرفر.");
    }

    return data;
  }

  async function loadDashboard(showLoading = true) {
    if (showLoading) setLoading(true);
    setError("");


    try {
      const data = await apiRequest(API_URL);
      const items = Array.isArray(data) ? data : data.leads;

      if (!Array.isArray(items)) {
        throw new Error("استجابة السيرفر لا تحتوي على قائمة العملاء المتوقعة.");
      }

      const sortedItems = [...items].sort((a, b) => {
        const dateA = new Date(a.createdAt || a.created_at || 0);
        const dateB = new Date(b.createdAt || b.created_at || 0);

        return dateB - dateA;
      });

      setLeads(sortedItems);
    } catch (err) {
      setError(err.message || "تعذر تحميل طلبات العملاء.");
    } finally {
      setLoading(false);
    }
  }

  const loadProjects = async () => {
    try {
      setProjectsLoading(true);
      setProjectsError("");

      const data = await apiRequest(PROJECTS_API_URL);

      setProjects(data.projects || []);
    } catch (error) {
      console.error("Load Projects Error:", error);
      setProjectsError("Failed to load projects");
    } finally {
      setProjectsLoading(false);
    }
  };

  const startEditingProject = (project) => {
    setSelectedProject(project);

    setProjectEditForm({
      projectName: project.projectName || "",
      description: project.description || "",
      service: project.service || "",
      status: project.status || "Pending",
      contractValue: project.contractValue ?? 0,
      paidAmount: project.paidAmount ?? 0,
      startDate: project.startDate
        ? new Date(project.startDate).toISOString().slice(0, 10)
        : "",
      deadline: project.deadline
        ? new Date(project.deadline).toISOString().slice(0, 10)
        : "",
      progress: project.progress ?? 0,
      assignedTo: project.assignedTo || "",
    });

    setIsEditingProject(true);
  };

  const saveProjectChanges = async () => {
    if (!selectedProject || savingProject) return;

    const contractValue = Number(projectEditForm.contractValue);
    const paidAmount = Number(projectEditForm.paidAmount);
    const progress = Number(projectEditForm.progress);

    if (paidAmount > contractValue) {
      showToast("المبلغ المدفوع لا يمكن أن يتجاوز قيمة العقد", "error");
      return;
    }

    if (progress < 0 || progress > 100) {
      showToast("نسبة الإنجاز يجب أن تكون بين 0 و100", "error");
      return;
    }

    try {
      setSavingProject(true);

      const data = await apiRequest(
        `${PROJECTS_API_URL}/${selectedProject._id}`,
        {
          method: "PUT",
          body: JSON.stringify({
            ...projectEditForm,
            contractValue,
            paidAmount,
            progress,
          }),
        }
      );

      const updatedProject = data.project || data;

      setProjects((currentProjects) =>
        currentProjects.map((project) =>
          project._id === selectedProject._id
            ? updatedProject
            : project
        )
      );

      setSelectedProject(updatedProject);
      setIsEditingProject(false);

      showToast("تم تحديث المشروع بنجاح", "success");
    } catch (error) {
      console.error("Update Project Error:", error);
      showToast(error.message || "فشل تحديث المشروع", "error");
    } finally {
      setSavingProject(false);
    }
  };
  async function deleteProject(id) {
    if (deletingProjectIds.includes(id)) return false;

    setDeletingProjectIds((current) => [...current, id]);

    try {
      await apiRequest(`${PROJECTS_API_URL}/${id}`, {
        method: "DELETE",
      });

      setProjects((current) =>
        current.filter((project) => project._id !== id)
      );

      if (viewingProject?._id === id) {
        setViewingProject(null);
      }

      if (selectedProject?._id === id) {
        setSelectedProject(null);
        setIsEditingProject(false);
      }

      showToast("تم حذف المشروع بنجاح", "success");

      return true;
    } catch (error) {
      console.error("Delete Project Error:", error);
      showToast(error.message || "فشل حذف المشروع", "error");

      return false;
    } finally {
      setDeletingProjectIds((current) =>
        current.filter((projectId) => projectId !== id)
      );
    }
  }

  function exportProjectsToExcel() {
    if (!filteredProjects.length) {
      showToast("لا توجد مشاريع لتصديرها", "error");
      return;
    }

    const rows = filteredProjects.map((project) => ({
      "Project Name": project.projectName || "",
      "Client": project.lead?.name || "",
      "Service": project.service || "",
      "Status": project.status || "",
      "Contract Value (EGP)": Number(project.contractValue || 0),
      "Paid Amount (EGP)": Number(project.paidAmount || 0),
      "Remaining Amount (EGP)": Number(
        project.remainingAmount ??
        (Number(project.contractValue || 0) - Number(project.paidAmount || 0))
      ),
      "Progress (%)": Number(project.progress || 0),
      "Start Date": project.startDate
        ? new Date(project.startDate).toLocaleDateString("en-GB")
        : "",
      "Deadline": project.deadline
        ? new Date(project.deadline).toLocaleDateString("en-GB")
        : "",
      "Assigned To": project.assignedTo || "",
      "Description": project.description || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);

    // تثبيت صف العناوين أثناء التمرير
    worksheet["!freeze"] = {
      xSplit: 0,
      ySplit: 1,
      topLeftCell: "A2",
      activePane: "bottomLeft",
      state: "frozen",
    };

    // ضبط عرض الأعمدة
    worksheet["!cols"] = [
      { wch: 25 }, // Project Name
      { wch: 22 }, // Client
      { wch: 22 }, // Service
      { wch: 18 }, // Status
      { wch: 22 }, // Contract Value
      { wch: 20 }, // Paid Amount
      { wch: 23 }, // Remaining Amount
      { wch: 16 }, // Progress
      { wch: 16 }, // Start Date
      { wch: 16 }, // Deadline
      { wch: 22 }, // Assigned To
      { wch: 40 }, // Description
    ];

    // تفعيل الفلترة على عناوين الجدول
    worksheet["!autofilter"] = {
      ref: worksheet["!ref"],
    };

    // تنسيق الأرقام
    const range = XLSX.utils.decode_range(worksheet["!ref"]);

    for (let row = 1; row <= range.e.r; row++) {
      ["E", "F", "G"].forEach((col) => {
        const cell = worksheet[`${col}${row + 1}`];

        if (cell) {
          cell.z = '#,##0.00 "EGP"';
        }
      });

      const progressCell = worksheet[`H${row + 1}`];

      if (progressCell) {
        progressCell.z = '0"%"';
      }
    }
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Projects");

    XLSX.writeFile(workbook, "SoftCompany-Projects.xlsx");

    showToast("تم تصدير المشاريع إلى Excel بنجاح", "success");
  }
  useEffect(() => {
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    loadDashboard();
    loadProjects();
  }, []);

  const services = useMemo(
    () => [...new Set(leads.map((lead) => lead.service).filter(Boolean))],
    [leads]
  );


  const filteredLeads = useMemo(() => {
    const term = search.trim().toLowerCase();

    return leads.filter((lead) => {
      const matchesSearch = [
        lead.name,
        lead.email,
        lead.phone,
        lead.company,
      ].some((value) =>
        String(value || "").toLowerCase().includes(term)
      );

      const matchesStatus =
        statusFilter === "All" || lead.status === statusFilter;

      const matchesService =
        serviceFilter === "All" || lead.service === serviceFilter;

      return matchesSearch && matchesStatus && matchesService;
    });
  }, [leads, search, statusFilter, serviceFilter]);

  const totalPages = Math.ceil(filteredLeads.length / leadsPerPage);

  const currentLeads = useMemo(() => {
    const startIndex = (currentPage - 1) * leadsPerPage;
    return filteredLeads.slice(startIndex, startIndex + leadsPerPage);
  }, [filteredLeads, currentPage]);

  useEffect(() => {
    setCurrentPage((page) => {
      if (totalPages === 0) return 1;
      return Math.min(page, totalPages);
    });
  }, [totalPages]);

  const stats = useMemo(
    () => [
      {
        label: "إجمالي الطلبات",
        value: leads.length,
        icon: "bi-inbox",
        color: "blue",
      },
      {
        label: "طلبات جديدة",
        value: leads.filter((lead) => lead.status === "New").length,
        icon: "bi-stars",
        color: "purple",
      },
      {
        label: "قيد التنفيذ",
        value: leads.filter((lead) => lead.status === "In Progress").length,
        icon: "bi-arrow-repeat",
        color: "orange",
      },
      {
        label: "عملاء تم كسبهم",
        value: leads.filter((lead) => lead.status === "Won").length,
        icon: "bi-trophy",
        color: "green",
      },
      {
        label: "معدل تحويل العملاء",
        value: leads.length
          ? `${(
            (leads.filter((lead) => lead.status === "Won").length /
              leads.length) *
            100
          ).toFixed(1)}%`
          : "0%",
        icon: "bi-graph-up-arrow",
        color: "green",
      },
    ],
    [leads]
  );
  const statusChartData = useMemo(() => {
    const statuses = [
      "New",
      "Contacted",
      "Interested",
      "In Progress",
      "Won",
      "Lost",
    ];

    return statuses.map((status) => ({
      name: status,
      count: leads.filter((lead) => lead.status === status).length,
    }));
  }, [leads]);


  // Upcoming Follow-ups
  const followUpTasks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const tasks = leads.flatMap((lead) =>
      (lead.followUps || [])
        .filter(
          (followUp) => followUp.nextFollowUpAt && !followUp.completed
        )
        .map((followUp) => {
          const dueDate = new Date(followUp.nextFollowUpAt);

          let category = "upcoming";

          if (dueDate < today) {
            category = "overdue";
          } else if (dueDate < tomorrow) {
            category = "today";
          }

          return {
            lead,
            followUp,
            dueDate,
            category,
          };
        })
        .filter((task) => !Number.isNaN(task.dueDate.getTime()))
    );

    tasks.sort((a, b) => a.dueDate - b.dueDate);

    return {
      overdue: tasks.filter((task) => task.category === "overdue"),
      today: tasks.filter((task) => task.category === "today"),
      upcoming: tasks.filter((task) => task.category === "upcoming"),
    };
  }, [leads]);

  function setLeadUpdating(id, busy) {
    setUpdatingLeadIds((current) =>
      busy
        ? [...current, id]
        : current.filter((item) => item !== id)
    );
  }

  function setLeadDeleting(id, busy) {
    setDeletingLeadIds((current) =>
      busy
        ? [...current, id]
        : current.filter((item) => item !== id)
    );
  }

  async function updateStatus(id, status) {
    if (
      updatingLeadIds.includes(id) ||
      deletingLeadIds.includes(id)
    ) return;

    setLeadUpdating(id, true);

    try {
      await apiRequest(`${API_URL}/${id}`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });

      setLeads((current) =>
        current.map((lead) =>
          lead._id === id ? { ...lead, status } : lead
        )
      );

      showToast("تم تحديث حالة الطلب بنجاح.", "success");
    } catch (err) {
      showToast(err.message || "فشل تحديث حالة الطلب.", "error");
    } finally {
      setLeadUpdating(id, false);
    }
  }

  async function deleteLead(id) {
    if (
      updatingLeadIds.includes(id) ||
      deletingLeadIds.includes(id)
    ) return;

    const confirmed = window.confirm(
      "هل أنت متأكد من حذف طلب العميل؟ لا يمكن التراجع عن هذا الإجراء."
    );

    if (!confirmed) return;

    setLeadDeleting(id, true);

    try {
      await apiRequest(`${API_URL}/${id}`, {
        method: "DELETE",
      });

      setLeads((current) =>
        current.filter((lead) => lead._id !== id)
      );

      showToast("تم حذف الطلب بنجاح.", "success");
    } catch (err) {
      showToast(err.message || "فشل حذف الطلب.", "error");
    } finally {
      setLeadDeleting(id, false);
    }
  }
  function startEditingLead() {
    setEditForm({
      name: selectedLead.name || "",
      email: selectedLead.email || "",
      phone: selectedLead.phone || "",
      company: selectedLead.company || "",
      service: selectedLead.service || "",
      budget: selectedLead.budget || "",
      message: selectedLead.message || "",
    });

    setIsEditingLead(true);
  }

  async function saveLeadChanges() {
    try {
      const updatedLead = await apiRequest(`${API_URL}/${selectedLead._id}`, {
        method: "PUT",
        body: JSON.stringify(editForm),
      });

      const savedLead = updatedLead.lead || updatedLead;

      setLeads((current) =>
        current.map((lead) =>
          lead._id === selectedLead._id
            ? { ...lead, ...savedLead }
            : lead
        )
      );

      setSelectedLead((current) => ({
        ...current,
        ...savedLead,
      }));

      setIsEditingLead(false);
      showToast("تم تحديث بيانات العميل بنجاح.", "success");
    } catch (err) {
      showToast(err.message || "فشل تحديث بيانات العميل.", "error");
    }
  }


  async function addFollowUp() {
    if (!selectedLead || savingFollowUp) return;

    if (!followUpNote.trim()) {
      showToast("من فضلك اكتب ملاحظة المتابعة.", "error");
      return;
    }

    setSavingFollowUp(true);

    try {
      const data = await apiRequest(
        `${API_URL}/${selectedLead._id}/follow-ups`,
        {
          method: "POST",
          body: JSON.stringify({
            note: followUpNote,
            outcome: followUpOutcome,
            contactedAt: new Date(contactedAt).toISOString(),
            nextFollowUpAt: nextFollowUpAt
              ? new Date(nextFollowUpAt).toISOString()
              : null,
          }),
        }
      );

      const updatedLead = data.lead;

      setSelectedLead(updatedLead);

      setLeads((current) =>
        current.map((lead) =>
          lead._id === updatedLead._id ? updatedLead : lead
        )
      );

      setFollowUpNote("");
      setFollowUpOutcome("Spoke to Client");
      setContactedAt(new Date().toISOString().slice(0, 16));
      setNextFollowUpAt("");

      showToast("تمت إضافة المتابعة بنجاح.", "success");
    } catch (err) {
      showToast(err.message || "فشل إضافة المتابعة.", "error");
    } finally {
      setSavingFollowUp(false);
    }
  }

  async function completeFollowUp(leadId, followUpId) {
    if (completingFollowUpIds.includes(followUpId)) return;

    setCompletingFollowUpIds((current) => [
      ...current,
      followUpId,
    ]);

    try {
      const data = await apiRequest(
        `${API_URL}/${leadId}/follow-ups/${followUpId}/complete`,
        {
          method: "PATCH",
        }
      );

      const updatedLead = data.lead;

      // Update leads list
      setLeads((current) =>
        current.map((lead) =>
          lead._id === updatedLead._id ? updatedLead : lead
        )
      );

      // Update selected client if currently open
      setSelectedLead((current) =>
        current?._id === updatedLead._id ? updatedLead : current
      );

      showToast("تم إكمال المتابعة بنجاح", "success");
    } catch (error) {
      showToast(error.message || "فشل إكمال المتابعة", "error");
    } finally {
      setCompletingFollowUpIds((current) =>
        current.filter((id) => id !== followUpId)
      );
    }
  }

  async function rejectLead(leadId) {
    if (!window.confirm("Are you sure you want to reject this request?")) {
      return;
    }

    try {
      const data = await apiRequest(`${API_URL}/${leadId}/decision`, {
        method: "PATCH",
        body: JSON.stringify({ decision: "Rejected" }),
      });

      setLeads((prev) =>
        prev.map((lead) =>
          lead._id === leadId ? data.lead : lead
        )
      );

      setSelectedLead(data.lead);
      setIsReviewingLead(false);

      showToast(
        data.emailSent
          ? "Request rejected and email sent successfully"
          : "Request rejected, but email could not be sent",
        data.emailSent ? "success" : "error"
      );
    } catch (error) {
      showToast(error.message || "Failed to reject request", "error");
    }
  }

  function openConversionForm() {
    if (!selectedLead) return;

    setConversionForm({
      projectName: `${selectedLead.name || "Client"} Project`,
      contractValue: "",
      paidAmount: 0,
      startDate: "",
      deadline: "",
      assignedTo: "",
      description: selectedLead.message || "",
    });

    setConvertingLead(selectedLead);
    setIsReviewingLead(false);
    setIsConvertingLead(true);
  }


  async function convertLeadToProject() {
    if (!convertingLead || savingConversion) return;

    const contractValue = Number(conversionForm.contractValue);
    const paidAmount = Number(conversionForm.paidAmount);

    if (
      !conversionForm.projectName.trim() ||
      conversionForm.contractValue === ""
    ) {
      showToast("من فضلك أدخل اسم المشروع وقيمة العقد", "error");
      return;
    }

    if (
      !Number.isFinite(contractValue) ||
      contractValue < 0 ||
      !Number.isFinite(paidAmount) ||
      paidAmount < 0
    ) {
      showToast("تأكد من صحة المبالغ المدخلة", "error");
      return;
    }

    if (paidAmount > contractValue) {
      showToast("المبلغ المدفوع لا يمكن أن يتجاوز قيمة العقد", "error");
      return;
    }

    try {
      setSavingConversion(true);

      const data = await apiRequest(PROJECTS_API_URL, {
        method: "POST",
        body: JSON.stringify({
          lead: convertingLead._id,
          ...conversionForm,
          contractValue,
          paidAmount,
          service: convertingLead.service,
        }),
      });

      const updatedLead = data.lead;

      if (!updatedLead) {
        throw new Error("السيرفر لم يرجع بيانات العميل المحدثة");
      }

      setLeads((current) =>
        current.map((lead) =>
          lead._id === updatedLead._id ? updatedLead : lead
        )
      );

      setSelectedLead(updatedLead);

      setIsConvertingLead(false);
      setConvertingLead(null);

      await loadProjects();

      showToast(
        data.emailSent
          ? "تم قبول الطلب وإنشاء المشروع وإرسال الإيميل بنجاح"
          : "تم قبول الطلب وإنشاء المشروع، لكن تعذر إرسال الإيميل",
        data.emailSent ? "success" : "error"
      );
    } catch (error) {
      console.error("Convert Lead Error:", error);

      showToast(
        error.message || "فشل تحويل الطلب إلى مشروع",
        "error"
      );
    } finally {
      setSavingConversion(false);
    }
  }


  function logout() {
    sessionStorage.removeItem("adminToken");
    sessionStorage.removeItem("adminInfo");
    navigate("/login", { replace: true });
  }

  function formatDate(dateValue) {
  if (!dateValue) return "Date unavailable";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

  return (
    <div className="sc-admin" data-theme={theme}>
      <aside className="sc-sidebar">
        <a className="sc-brand" href="/" aria-label="SoftCompany home">
          <span className="sc-brand-mark">S</span>
          <span>Soft<span className="sc-brand-accent">Company</span></span>
        </a>

        <p className="sc-nav-label">WORKSPACE</p>

        <nav className="sc-nav">
          <a className="sc-nav-link active" href="#dashboard">
            <i className="bi bi-grid-1x2" />
            Dashboard
          </a>
          <a className="sc-nav-link" href="#leads">
            <i className="bi bi-people" />
            Client Leads
            <span className="sc-nav-count">{leads.length}</span>
          </a>
        </nav>

        <div className="sc-sidebar-bottom">
          <div className="sc-admin-profile">
            <div className="sc-avatar">
              {(adminInfo.name || "A").charAt(0).toUpperCase()}
            </div>
            <div className="sc-profile-info">
              <strong>{adminInfo.name || "Administrator"}</strong>
              <span>Administrator</span>
            </div>
          </div>

          <button className="sc-logout" onClick={logout}>
            <i className="bi bi-box-arrow-left" />
            Sign out
          </button>
        </div>
      </aside>

      <main className="sc-main" id="dashboard">
        <header className="sc-topbar">
          <div>
            <p className="sc-breadcrumb">Workspace / Overview</p>
            <h1>Dashboard</h1>
            <p className="sc-subtitle">
              Welcome back, {adminInfo.name || "Admin"}. Here is your
              client activity.
            </p>
          </div>

          <div className="sc-topbar-actions">
            <button
              className="sc-icon-button"
              onClick={() =>
                setTheme((current) => current === "dark" ? "light" : "dark")
              }
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              <i className={`bi ${theme === "dark" ? "bi-sun" : "bi-moon-stars"}`} />
            </button>

            <button
              className="sc-refresh-button"
              onClick={() => loadDashboard()}
              disabled={loading}
            >
              <i className={`bi ${loading ? "bi-arrow-repeat" : "bi-arrow-clockwise"}`} />
              Refresh
            </button>
          </div>
        </header>

        {error && (
          <div className="sc-alert sc-alert-error" role="alert">
            <i className="bi bi-exclamation-circle" />
            <span>{error}</span>
            <button onClick={() => setError("")} aria-label="Close error">×</button>
          </div>
        )}
        <section className="sc-stats-grid" aria-label="Lead statistics">
          {stats.map((stat) => (
            <article className="sc-stat-card" key={stat.label}>
              <div className={`sc-stat-icon ${stat.color}`}>
                <i className={`bi ${stat.icon}`} />
              </div>

              <p>{stat.label}</p>
              <strong>{loading ? "—" : stat.value}</strong>
              <span className="sc-stat-note">Based on loaded leads</span>
            </article>
          ))}
        </section>


        <section className="sc-chart-section">
          <div className="sc-chart-header">
            <h3>توزيع العملاء حسب الحالة</h3>
            <p>عدد العملاء في كل مرحلة</p>
          </div>

          <div className="sc-chart-scroll">
            <div className="sc-chart-inner">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={statusChartData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 35 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />

                  <XAxis
                    dataKey="name"
                    interval={0}
                    tick={{ fontSize: 11 }}
                    height={35}
                  />

                  <YAxis allowDecimals={false} />

                  <Tooltip
                    animationDuration={300}
                    cursor={{ fill: "rgba(99, 102, 241, 0.08)" }}
                  />

                  <Bar
                    dataKey="count"
                    fill="#6366f1"
                    radius={[6, 6, 0, 0]}
                    animationDuration={800}
                    animationEasing="ease-out"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
        {/* Upcoming Follow-ups */}
        <section className="sc-followups-dashboard">
          <div className="sc-panel-heading">
            <div>
              <h2>Upcoming Follow-ups</h2>
              <p>Track your client contact schedule.</p>
            </div>

            <span className="sc-results-count">
              {followUpTasks.overdue.length +
                followUpTasks.today.length +
                followUpTasks.upcoming.length}{" "}
              Activities
            </span>
          </div>

          <div className="sc-followups-grid">
            {[
              {
                key: "overdue",
                title: "Overdue",
                icon: "bi-exclamation-circle",
                tasks: followUpTasks.overdue,
              },
              {
                key: "today",
                title: "Today",
                icon: "bi-calendar-check",
                tasks: followUpTasks.today,
              },
              {
                key: "upcoming",
                title: "Upcoming",
                icon: "bi-calendar-event",
                tasks: followUpTasks.upcoming,
              },
            ].map((group) => (
              <div
                className={`sc-followup-column ${group.key}`}
                key={group.key}
              >
                <div className="sc-followup-column-header">
                  <h3>
                    <i className={`bi ${group.icon}`} />
                    {group.title}
                  </h3>

                  <span>{group.tasks.length}</span>
                </div>

                {group.tasks.length === 0 ? (
                  <p className="sc-followup-empty">
                    No follow-ups here.
                  </p>
                ) : (
                  group.tasks.map((task) => (
                    <article
                      className="sc-upcoming-card"
                      key={`${task.lead._id}-${task.followUp._id}`}
                    >
                      <strong>{task.lead.name}</strong>

                      <span>{task.lead.phone}</span>

                      <small>
                        <i className="bi bi-clock" />
                        {formatDate(task.dueDate)}
                      </small>

                      <p>{task.followUp.note}</p>

                      <div className="sc-upcoming-actions">
                        <button
                          type="button"
                          className="sc-followup-complete"
                          disabled={completingFollowUpIds.includes(task.followUp._id)}
                          onClick={() =>
                            completeFollowUp(task.lead._id, task.followUp._id)
                          }
                        >
                          {completingFollowUpIds.includes(task.followUp._id) ? (
                            "Completing..."
                          ) : (
                            <>
                              <i className="bi bi-check-circle" />
                              Mark Completed
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedLead(task.lead)}
                        >
                          View Client
                          <i className="bi bi-arrow-right" />
                        </button>
                      </div>
                    </article>
                  ))
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Projects Section */}
        <section className="sc-leads-panel" id="projects">
          <div className="sc-panel-heading">
            <div>
              <h2>Projects</h2>
              <p>Track your active and completed projects.</p>
            </div>

            <div className="sc-project-heading-actions">
              <button
                type="button"
                className="sc-refresh-button"
                onClick={exportProjectsToExcel}
                disabled={!filteredProjects.length}
              >
                <i className="bi bi-file-earmark-excel" />
                Export Excel
              </button>

              <span className="sc-results-count">
                {filteredProjects.length} Projects
              </span>
            </div>
          </div>

          <div className="sc-filters">
            <label className="sc-search">
              <i className="bi bi-search" />
              <input
                type="search"
                placeholder="Search projects or clients..."
                value={projectSearch}
                onChange={(e) => setProjectSearch(e.target.value)}
              />
            </label>

            <select
              value={projectStatusFilter}
              onChange={(e) => setProjectStatusFilter(e.target.value)}
            >
              <option value="All">All statuses</option>
              {[
                "Pending",
                "In Progress",
                "On Hold",
                "Review",
                "Completed",
                "Delivered",
              ].map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          {projectsLoading ? (
            <div className="sc-empty-state">
              <i className="bi bi-arrow-repeat sc-loading-icon" />
              <strong>Loading projects...</strong>
            </div>
          ) : projectsError ? (
            <div className="sc-alert sc-alert-error">
              {projectsError}
              <button onClick={loadProjects}>Retry</button>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="sc-empty-state">
              <i className="bi bi-folder2-open" />
              <strong>No projects found</strong>
              <span>Try changing your search or filters.</span>
            </div>
          ) : (
            <>
              <div className="sc-table-scroll">
                <table className="sc-leads-table">
                  <thead>
                    <tr>
                      <th>PROJECT</th>
                      <th>CLIENT</th>
                      <th>STATUS</th>
                      <th>CONTRACT</th>
                      <th>PAID</th>
                      <th>REMAINING</th>
                      <th>PROGRESS</th>
                      <th>DEADLINE</th>
                      <th>ACTION</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredProjects.map((project) => (
                      <tr key={project._id}>





                        <td>
                          <strong>{project.projectName}</strong>
                          <div>{project.service}</div>
                        </td>

                        <td>{project.lead?.name || "—"}</td>

                        <td>
                          <span
                            className={`sc-status status-${String(project.status || "Pending")
                              .toLowerCase()
                              .replace(/\s+/g, "-")}`}
                          >
                            {project.status || "Pending"}
                          </span>
                        </td>

                        <td>
                          {Number(project.contractValue || 0).toLocaleString()} EGP
                        </td>

                        <td>
                          {Number(project.paidAmount || 0).toLocaleString()} EGP
                        </td>

                        <td>
                          {Number(project.remainingAmount || 0).toLocaleString()} EGP
                        </td>

                        <td>
                          <div className="sc-project-progress">
                            <div className="sc-project-progress-track">
                              <div
                                className="sc-project-progress-fill"
                                style={{
                                  width: `${Math.min(100, Math.max(0, Number(project.progress) || 0))}%`,
                                }}
                              />
                            </div>

                            <strong>{project.progress || 0}%</strong>
                          </div>
                        </td>

                        <td>{formatDate(project.deadline)}</td>

                        <td>
                          <div className="sc-project-actions">
                            <button
                              type="button"
                              className="sc-details-button"
                              onClick={() => setViewingProject(project)}
                              title="View project details"
                              aria-label="View project details"
                            >
                              <i className="bi bi-eye" />
                            </button>

                            <button
                              type="button"
                              className="sc-edit-button"
                              onClick={() => startEditingProject(project)}
                            >
                              <i className="bi bi-pencil-square" />
                              Edit
                            </button>



                            <button
                              type="button"
                              className="sc-delete-button"
                              disabled={deletingProjectIds.includes(project._id)}
                              onClick={() => setProjectToDelete(project)}
                              title="Delete project"
                              aria-label="Delete project"
                            >
                              {deletingProjectIds.includes(project._id) ? (
                                <span className="sc-loading-icon">⟳</span>
                              ) : (
                                <i className="bi bi-trash3" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>


              {/* Mobile Projects Cards */}
              <div className="sc-mobile-projects">
                {filteredProjects.map((project) => {
                  const progress = Math.min(
                    100,
                    Math.max(0, Number(project.progress) || 0)
                  );

                  const statusClass = `status-${String(
                    project.status || "Pending"
                  ).toLowerCase().replace(/\s+/g, "-")}`;

                  return (
                    <article className="sc-project-card" key={project._id}>
                      <div className="sc-project-card-header">
                        <div>
                          <h3>{project.projectName}</h3>
                          <span>{project.service}</span>
                        </div>

                        <span className={`sc-status ${statusClass}`}>
                          {project.status || "Pending"}
                        </span>
                      </div>

                      <div className="sc-project-client">
                        <i className="bi bi-person" />
                        {project.lead?.name || "—"}
                      </div>

                      <div className="sc-project-financials">
                        <div>
                          <span>Contract</span>
                          <strong>{Number(project.contractValue || 0).toLocaleString()} EGP</strong>
                        </div>
                        <div>
                          <span>Paid</span>
                          <strong>{Number(project.paidAmount || 0).toLocaleString()} EGP</strong>
                        </div>
                        <div>
                          <span>Remaining</span>
                          <strong>{Number(project.remainingAmount || 0).toLocaleString()} EGP</strong>
                        </div>
                      </div>

                      <div className="sc-project-card-progress">
                        <div>
                          <span>Project Progress</span>
                          <strong>{progress}%</strong>
                        </div>

                        <div className="sc-project-progress-track">
                          <div
                            className="sc-project-progress-fill"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      <div className="sc-project-deadline">
                        <i className="bi bi-calendar-event" />
                        <span>Deadline:</span>
                        <strong>{formatDate(project.deadline)}</strong>
                      </div>

                      <div className="sc-project-actions">
                        {/* زرار عرض التفاصيل */}
                        <button
                          type="button"
                          className="sc-details-button"
                          onClick={() => setViewingProject(project)}
                          title="View project details"
                          aria-label="View project details"
                        >
                          <i className="bi bi-eye" />
                        </button>

                        {/* زرار التعديل */}
                        <button
                          type="button"
                          className="sc-edit-button"
                          onClick={() => startEditingProject(project)}
                        >
                          <i className="bi bi-pencil-square" />
                          Edit
                        </button>

                        {/* زرار الحذف */}
                        <button
                          type="button"
                          className="sc-delete-button"
                          disabled={deletingProjectIds.includes(project._id)}
                          onClick={() => setProjectToDelete(project)}
                          title="Delete project"
                          aria-label="Delete project"
                        >
                          {deletingProjectIds.includes(project._id) ? (
                            <span className="sc-loading-icon">⟳</span>
                          ) : (
                            <i className="bi bi-trash3" />
                          )}
                        </button>
                      </div>

                    </article>
                  );
                })}
              </div>
            </>


          )}
        </section>





        <section className="sc-leads-panel" id="leads">
          <div className="sc-panel-heading">
            <div>
              <h2>Client Leads</h2>
              <p>Review requests and manage their progress.</p>
            </div>
            <span className="sc-results-count">
              {filteredLeads.length} results
            </span>
          </div>

          <div className="sc-filters">
            <label className="sc-search">
              <i className="bi bi-search" />
              <input
                type="search"
                placeholder="Search name, email, phone or company..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>

            <select
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="All">All statuses</option>
              {STATUSES.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>

            <select
              aria-label="Filter by service"
              value={serviceFilter}
              onChange={(event) => setServiceFilter(event.target.value)}
            >
              <option value="All">All services</option>
              {services.map((service) => (
                <option key={service} value={service}>{service}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="sc-empty-state">
              <i className="bi bi-arrow-repeat sc-loading-icon" />
              <strong>Loading leads...</strong>
              <span>Please wait while we retrieve your data.</span>
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="sc-empty-state">
              <i className="bi bi-inbox" />
              <strong>No leads found</strong>
              <span>Try changing your search or filters.</span>
              <button
                className="sc-reset-button"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("All");
                  setServiceFilter("All");
                }}
              >
                Clear filters
              </button>
            </div>
          ) : (

            <>
              <div className="sc-table-scroll">
                <table className="sc-leads-table">
                  <thead>
                    <tr>
                      <th>CLIENT</th>
                      <th>SERVICE</th>
                      <th>BUDGET</th>
                      <th>DATE</th>
                      <th>STATUS</th>
                      <th>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentLeads.map((lead) => {
                      const isUpdating = updatingLeadIds.includes(lead._id);
                      const isDeleting = deletingLeadIds.includes(lead._id);

                      return (
                        <tr key={lead._id}>
                          <td>
                            <div className="sc-client-cell">
                              <div className="sc-client-avatar">
                                {(lead.name || "?").charAt(0).toUpperCase()}
                              </div>
                              <div className="sc-client-info">
                                <strong>{lead.name || "—"}</strong>
                                <a href={`mailto:${lead.email}`}>
                                  {lead.email || "—"}
                                </a>
                                <span>{lead.phone || "—"}</span>
                              </div>
                            </div>
                          </td>
                          <td>{lead.service || "—"}</td>
                          <td>{lead.budget || "—"}</td>
                          <td>{formatDate(lead.created_at || lead.createdAt)}</td>
                          <td>
                            <span className={`sc-status status-${(lead.status || "New").toLowerCase().replace(/\s+/g, "-")}`}>
                              {lead.status || "New"}
                            </span>

                            <div className="sc-status-control sc-mobile-status">
                              {isUpdating && (
                                <span className="sc-loading-icon">⟳</span>
                              )}

                              <select
                                className="sc-status-select"
                                disabled={isUpdating || isDeleting}
                                aria-label={`Change status for ${lead.name}`}
                                value={lead.status || "New"}
                                onChange={(event) => updateStatus(lead._id, event.target.value)}
                              >
                                {STATUSES.map((status) => (
                                  <option key={status} value={status}>
                                    {status}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </td>
                          <td>
                            <div className="sc-mobile-lead-actions">
                              <button
                                type="button"
                                className="sc-details-button"
                                onClick={() => setSelectedLead(lead)}
                                title="View client details"
                              >
                                <i className="bi bi-eye" />
                              </button>

                              {lead.phone && (
                                <>
                                  <a
                                    href={`https://wa.me/${getWhatsAppNumber(lead.phone)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="sc-contact-button sc-whatsapp-button"
                                    title="Contact via WhatsApp"
                                    aria-label="Contact via WhatsApp"
                                  >
                                    <i className="bi bi-whatsapp" />
                                  </a>

                                  <a
                                    href={`tel:${lead.phone}`}
                                    className="sc-contact-button sc-phone-button"
                                    title="Call client"
                                    aria-label="Call client"
                                  >
                                    <i className="bi bi-telephone-fill" />
                                  </a>
                                </>
                              )}

                              <button
                                type="button"
                                className="sc-delete-button"
                                disabled={isUpdating || isDeleting}
                                onClick={() => deleteLead(lead._id)}
                                aria-label={`Delete lead from ${lead.name}`}
                                title="Delete lead"
                              >
                                {isDeleting ? (
                                  <span className="sc-loading-icon">⟳</span>
                                ) : (
                                  <i className="bi bi-trash3" />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="sc-mobile-leads">
                {currentLeads.map((lead) => {
                  const isUpdating = updatingLeadIds.includes(lead._id);
                  const isDeleting = deletingLeadIds.includes(lead._id);

                  return (
                    <article className="sc-mobile-lead-card" key={lead._id}>

                      <div className="sc-mobile-lead-heading">
                        <div className="sc-client-cell">
                          <div className="sc-client-avatar">
                            {(lead.name || "?").charAt(0).toUpperCase()}
                          </div>
                          <div className="sc-client-info">
                            <strong>{lead.name || "—"}</strong>
                            <a href={`mailto:${lead.email}`}>
                              {lead.email || "—"}
                            </a>
                          </div>
                        </div>
                        <div className="sc-mobile-lead-actions">
                          <button
                            type="button"
                            className="sc-details-button"
                            onClick={() => setSelectedLead(lead)}
                            title="View client details"
                          >
                            <i className="bi bi-eye" />
                          </button>
                          {lead.phone && (
                            <>
                              <a
                                href={`https://wa.me/${getWhatsAppNumber(lead.phone)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="sc-contact-button sc-whatsapp-button"
                                title="Contact via WhatsApp"
                                aria-label="Contact via WhatsApp"
                              >
                                <i className="bi bi-whatsapp" />
                              </a>

                              <a
                                href={`tel:${lead.phone}`}
                                className="sc-contact-button sc-phone-button"
                                title="Call client"
                                aria-label="Call client"
                              >
                                <i className="bi bi-telephone-fill" />
                              </a>
                            </>
                          )}

                          <button
                            type="button"
                            className="sc-delete-button"
                            disabled={isUpdating || isDeleting}
                            onClick={() => deleteLead(lead._id)}
                            aria-label={`Delete lead from ${lead.name}`}
                            title="Delete lead"
                          >
                            {isDeleting ? (
                              <span className="sc-loading-icon">⟳</span>
                            ) : (
                              <i className="bi bi-trash3" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="sc-mobile-lead-details">
                        <div>
                          <span>Phone</span>
                          <strong>{lead.phone || "—"}</strong>
                        </div>
                        <div>
                          <span>Service</span>
                          <strong>{lead.service || "—"}</strong>
                        </div>
                        <div>
                          <span>Budget</span>
                          <strong>{lead.budget || "—"}</strong>
                        </div>
                        <div>
                          <span>Date</span>
                          <strong>{formatDate(lead.created_at || lead.createdAt)}</strong>
                        </div>
                        <div className="sc-status-control sc-mobile-status">
                          {isUpdating && (
                            <span className="sc-loading-icon">⟳</span>
                          )}

                          <select
                            className="sc-status-select"
                            disabled={isUpdating || isDeleting}
                            aria-label={`Change status for ${lead.name}`}
                            value={lead.status || "New"}
                            onChange={(event) => updateStatus(lead._id, event.target.value)}
                          >
                            {STATUSES.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="sc-pagination">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((page) => page - 1)}
                  >
                    Previous
                  </button>

                  <span>
                    Page {currentPage} of {totalPages}
                  </span>

                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((page) => page + 1)}
                  >
                    Next
                  </button>
                </div>
              )}

            </>

          )}

          <footer className="sc-panel-footer">
            <span>Showing {filteredLeads.length} of {leads.length} loaded leads</span>
            <span>SoftCompany CRM</span>
          </footer>
        </section>

        <footer className="sc-page-footer">
          <span>© {new Date().getFullYear()} SoftCompany</span>
          <span>Client Management Workspace</span>
        </footer>
        {selectedLead && (
          <div
            className="sc-modal-overlay"
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                setSelectedLead(null);
              }
            }}
          >
            <section
              className="sc-details-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="sc-details-title"
            >
              <div className="sc-details-header">
                <div>
                  <p>CLIENT DETAILS</p>
                  <h2 id="sc-details-title">
                    {selectedLead.name || "—"}
                  </h2>
                </div>

                <button
                  type="button"
                  className="sc-modal-close"
                  onClick={() => setSelectedLead(null)}
                  aria-label="Close details"
                >
                  <i className="bi bi-x-lg" />
                </button>
              </div>

              <button
                type="button"
                className="sc-edit-button"
                onClick={startEditingLead}
              >
                <i className="bi bi-pencil-square" />
                Edit
              </button>

              {(!selectedLead.decision ||
                selectedLead.decision === "Pending") && (
                  <button
                    type="button"
                    className="sc-save-edit"
                    onClick={() => setIsReviewingLead(true)}
                  >
                    <i className="bi bi-clipboard-check" />
                    Review Request
                  </button>
                )}

              <div className="sc-modal-contact-actions">
                {selectedLead.phone && (
                  <>
                    <a
                      href={`https://wa.me/${getWhatsAppNumber(selectedLead.phone)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="sc-modal-whatsapp"
                    >
                      <i className="bi bi-whatsapp" />
                      WhatsApp
                    </a>

                    <a
                      href={`tel:${selectedLead.phone}`}
                      className="sc-modal-phone"
                    >
                      <i className="bi bi-telephone-fill" />
                      Call Client
                    </a>
                  </>
                )}

                {selectedLead.email && (
                  <a
                    href={`mailto:${selectedLead.email}`}
                    className="sc-modal-email"
                  >
                    <i className="bi bi-envelope-fill" />
                    Send Email
                  </a>
                )}
              </div>

              {selectedLead.email && (
                <form
                  className="sc-email-form"
                  onSubmit={(e) => {
                    e.preventDefault();

                    const mailtoLink =
                      `mailto:${selectedLead.email}` +
                      `?subject=${encodeURIComponent(emailSubject)}` +
                      `&body=${encodeURIComponent(emailMessage)}`;

                    window.location.href = mailtoLink;
                  }}
                >
                  <h3>Send Email to Client</h3>

                  <input
                    type="text"
                    placeholder="Email subject"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    required
                  />

                  <textarea
                    placeholder="Write your message..."
                    value={emailMessage}
                    onChange={(e) => setEmailMessage(e.target.value)}
                    rows="4"
                    required
                  />

                  <button type="submit">
                    <i className="bi bi-send-fill" />
                    Prepare Email
                  </button>
                </form>
              )}

              <div className="sc-details-grid">
                <div>
                  <span>Name</span>
                  {isEditingLead ? (
                    <input
                      value={editForm.name}
                      onChange={(e) =>
                        setEditForm({ ...editForm, name: e.target.value })
                      }
                    />
                  ) : (
                    <strong>{selectedLead.name || "—"}</strong>
                  )}
                </div>

                <div>
                  <span>Email</span>
                  {isEditingLead ? (
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) =>
                        setEditForm({ ...editForm, email: e.target.value })
                      }
                    />
                  ) : (
                    <strong>{selectedLead.email || "—"}</strong>
                  )}
                </div>

                <div>
                  <span>Phone</span>
                  {isEditingLead ? (
                    <input
                      value={editForm.phone}
                      onChange={(e) =>
                        setEditForm({ ...editForm, phone: e.target.value })
                      }
                    />
                  ) : (
                    <strong>{selectedLead.phone || "—"}</strong>
                  )}
                </div>

                <div>
                  <span>Company</span>
                  {isEditingLead ? (
                    <input
                      value={editForm.company}
                      onChange={(e) =>
                        setEditForm({ ...editForm, company: e.target.value })
                      }
                    />
                  ) : (
                    <strong>{selectedLead.company || "—"}</strong>
                  )}
                </div>

                <div>
                  <span>Service</span>
                  {isEditingLead ? (
                    <select
                      value={editForm.service}
                      onChange={(e) =>
                        setEditForm({ ...editForm, service: e.target.value })
                      }
                    >
                      {[
                        "Web Development",
                        "Mobile App",
                        "E-Commerce",
                        "UI/UX Design",
                        "Digital Marketing",
                        "Other",
                      ].map((service) => (
                        <option key={service} value={service}>{service}</option>
                      ))}
                    </select>
                  ) : (
                    <strong>{selectedLead.service || "—"}</strong>
                  )}
                </div>

                <div>
                  <span>Budget</span>
                  {isEditingLead ? (
                    <select
                      value={editForm.budget}
                      onChange={(e) =>
                        setEditForm({ ...editForm, budget: e.target.value })
                      }
                    >
                      {[
                        "Less than 10,000",
                        "10,000 - 25,000",
                        "25,000 - 50,000",
                        "50,000+",
                        "Not Sure",
                      ].map((budget) => (
                        <option key={budget} value={budget}>{budget}</option>
                      ))}
                    </select>
                  ) : (
                    <strong>{selectedLead.budget || "—"}</strong>
                  )}
                </div>

                <div>
                  <span>Status</span>
                  <strong>{selectedLead.status || "New"}</strong>
                </div>
              </div>

              <div className="sc-details-message">
                <span>Client Message</span>

                {isEditingLead ? (
                  <textarea
                    value={editForm.message}
                    onChange={(e) =>
                      setEditForm({ ...editForm, message: e.target.value })
                    }
                    rows={4}
                    placeholder="Enter client message..."
                  />
                ) : (
                  <p>{selectedLead.message || "No message provided."}</p>
                )}
              </div>

              {/* Activity Timeline */}
              <div className="sc-details-message">
                <div className="sc-followup-title">
                  <div>
                    <h3>Activity Timeline</h3>
                    <p>Complete history of client activities</p>
                  </div>

                  <span className="sc-followup-count">
                    {selectedLead.activities?.length || 0} Events
                  </span>
                </div>

                {!selectedLead.activities?.length ? (
                  <p>No activities recorded yet.</p>
                ) : (
                  <div className="sc-followup-timeline">
                    {[...selectedLead.activities]
                      .sort(
                        (a, b) =>
                          new Date(b.createdAt) - new Date(a.createdAt)
                      )
                      .map((activity) => (
                        <article
                          key={activity._id}
                          className="sc-followup-item"
                        >
                          <div className="sc-followup-header">
                            <strong>{activity.action}</strong>

                            <span className="sc-followup-date">
                              <i className="bi bi-calendar3" />
                              {formatDate(activity.createdAt)}
                            </span>
                          </div>

                          <p>{activity.description}</p>

                          <small>
                            <i className="bi bi-person-circle" />
                            Added by: {activity.createdBy?.name || "Unknown Admin"}
                          </small>
                        </article>
                      ))}
                  </div>
                )}
              </div>
              {/* Follow-up Form */}
              <div className="sc-details-message">
                <h3>Client Follow-up</h3>

                <label>Follow-up Note</label>
                <textarea
                  value={followUpNote}
                  onChange={(e) => setFollowUpNote(e.target.value)}
                  placeholder="Write details about the call or meeting..."
                  rows={4}
                  maxLength={1000}
                />

                <label>Contact Outcome</label>
                <select
                  value={followUpOutcome}
                  onChange={(e) => setFollowUpOutcome(e.target.value)}
                >
                  <option value="No Answer">No Answer</option>
                  <option value="Spoke to Client">Spoke to Client</option>
                  <option value="Interested">Interested</option>
                  <option value="Not Interested">Not Interested</option>
                  <option value="Callback Requested">Callback Requested</option>
                  <option value="Meeting Scheduled">Meeting Scheduled</option>
                </select>

                <label>Contact Date</label>
                <input
                  type="datetime-local"
                  value={contactedAt}
                  onChange={(e) => setContactedAt(e.target.value)}
                />

                <label>Next Follow-up</label>
                <input
                  type="datetime-local"
                  value={nextFollowUpAt}
                  onChange={(e) => setNextFollowUpAt(e.target.value)}
                />

                <button
                  type="button"
                  className="sc-save-edit"
                  onClick={addFollowUp}
                  disabled={savingFollowUp}
                >
                  {savingFollowUp ? "Saving..." : "Add Follow-up"}
                </button>
              </div>

              {/* Follow-up History */}
              <div className="sc-details-message">

                <div className="sc-followup-title">
                  <div>
                    <h3>Follow-up History</h3>
                    <p>Track all client interactions and updates</p>
                  </div>

                  <span className="sc-followup-count">
                    {selectedLead.followUps?.length || 0} Activities
                  </span>
                </div>

                {!selectedLead.followUps?.length ? (
                  <p>No follow-ups recorded yet.</p>
                ) : (
                  <div className="sc-followup-timeline">
                    {[...selectedLead.followUps]
                      .sort(
                        (a, b) =>
                          new Date(b.contactedAt) - new Date(a.contactedAt)
                      )
                      .map((followUp) => (
                        <article key={followUp._id} className="sc-followup-item">
                          <div className="sc-followup-header">
                            <strong
                              className={`sc-followup-badge sc-outcome-${followUp.outcome
                                .toLowerCase()
                                .replaceAll(" ", "-")}`}
                            >
                              {followUp.completed ? "Completed" : followUp.outcome}
                            </strong>

                            <span className="sc-followup-date">
                              <i className="bi bi-calendar3"></i>
                              {formatDate(followUp.contactedAt)}
                            </span>
                          </div>

                          <p>{followUp.note}</p>

                          <small>
                            <i className="bi bi-person-circle"></i>
                            Added by: {followUp.createdBy?.name || "Unknown Admin"}
                          </small>

                          {followUp.nextFollowUpAt && (
                            <small>
                              <i className="bi bi-clock"></i>
                              Next follow-up: {formatDate(followUp.nextFollowUpAt)}
                            </small>
                          )}
                        </article>
                      ))}
                  </div>
                )}
              </div>


              {isEditingLead && (
                <div className="sc-edit-actions">
                  <button
                    type="button"
                    className="sc-cancel-edit"
                    onClick={() => {
                      setIsEditingLead(false);
                      setEditForm({});
                    }}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    className="sc-save-edit"
                    onClick={saveLeadChanges}
                  >
                    <i className="bi bi-check-lg" />
                    Save Changes
                  </button>
                </div>
              )}


            </section>
          </div>
        )}

        {isReviewingLead && selectedLead && (
          <div
            className="sc-modal-overlay"
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                setIsReviewingLead(false);
              }
            }}
          >
            <section
              className="sc-details-modal sc-review-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="sc-review-title"
            >
              <div className="sc-modal-header">
                <h2 id="sc-review-title">Review Client Request</h2>

                <button
  type="button"
  className="sc-review-close"
  onClick={() => setIsReviewingLead(false)}
  aria-label="Close review"
>
  <i className="bi bi-x-lg" />
</button>
              </div>

              <div className="sc-review-content">
                <h3>{selectedLead.name}</h3>
                <p>{selectedLead.message || "No message provided."}</p>

                <div>
                  <span>Service</span>
                  <strong>{selectedLead.service || "—"}</strong>
                </div>

                <div>
                  <span>Budget</span>
                  <strong>{selectedLead.budget || "—"}</strong>
                </div>

                <div>
                  <span>Email</span>
                  <strong>{selectedLead.email || "—"}</strong>
                </div>
              </div>

              <div className="sc-review-actions">
                <button
                  type="button"
                  className="sc-review-btn sc-reject-btn"
                  onClick={() => rejectLead(selectedLead._id)}
                >
                  <i className="bi bi-x-circle-fill" />
                  <span>Reject Request</span>
                </button>

                <button
                  type="button"
                  className="sc-review-btn sc-accept-btn"
                  onClick={openConversionForm}
                >
                  <i className="bi bi-check-circle-fill" />
                  <span>Accept Request</span>
                </button>
              </div>
            </section>
          </div>
        )}

        {isConvertingLead && convertingLead && (
          <div
            className="sc-modal-overlay"
            onClick={(event) => {
              if (
                event.target === event.currentTarget &&
                !savingConversion
              ) {
                setIsConvertingLead(false);
                setConvertingLead(null);
              }
            }}
          >
            <section
              className="sc-details-modal sc-project-edit-modal"
              role="dialog"
              aria-modal="true"
            >
              <div className="sc-modal-header">
                <h2>Convert Lead to Project</h2>

                <button
                  type="button"
                  onClick={() => {
                    if (!savingConversion) {
                      setIsConvertingLead(false);
                      setConvertingLead(null);
                    }
                  }}
                >
                  <i className="bi bi-x-lg" />
                </button>
              </div>

              <form
                className="sc-project-edit-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  convertLeadToProject();
                }}
              >
                <label>Project Name</label>
                <input
                  type="text"
                  value={conversionForm.projectName}
                  onChange={(event) =>
                    setConversionForm({
                      ...conversionForm,
                      projectName: event.target.value,
                    })
                  }
                  required
                />

                <label>Service</label>
                <input
                  type="text"
                  value={convertingLead.service || ""}
                  readOnly
                />

                <label>Contract Value</label>
                <input
                  type="number"
                  min="0"
                  value={conversionForm.contractValue}
                  onChange={(event) =>
                    setConversionForm({
                      ...conversionForm,
                      contractValue: event.target.value,
                    })
                  }
                  required
                />

                <label>Paid Amount</label>
                <input
                  type="number"
                  min="0"
                  value={conversionForm.paidAmount}
                  onChange={(event) =>
                    setConversionForm({
                      ...conversionForm,
                      paidAmount: event.target.value,
                    })
                  }
                />

                <label>Start Date</label>
                <input
                  type="date"
                  value={conversionForm.startDate}
                  onChange={(event) =>
                    setConversionForm({
                      ...conversionForm,
                      startDate: event.target.value,
                    })
                  }
                />

                <label>Deadline</label>
                <input
                  type="date"
                  value={conversionForm.deadline}
                  onChange={(event) =>
                    setConversionForm({
                      ...conversionForm,
                      deadline: event.target.value,
                    })
                  }
                />

                <label>Assigned To</label>
                <input
                  type="text"
                  value={conversionForm.assignedTo}
                  onChange={(event) =>
                    setConversionForm({
                      ...conversionForm,
                      assignedTo: event.target.value,
                    })
                  }
                />

                <label>Description</label>
                <textarea
                  value={conversionForm.description}
                  onChange={(event) =>
                    setConversionForm({
                      ...conversionForm,
                      description: event.target.value,
                    })
                  }
                />

                <div className="sc-project-edit-actions">
                  <button
                    type="button"
                    onClick={() => {
                      if (!savingConversion) {
                        setIsConvertingLead(false);
                        setConvertingLead(null);
                      }
                    }}
                    disabled={savingConversion}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={savingConversion}
                  >
                    {savingConversion ? "Creating..." : "Create Project"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}

        {viewingProject && (
          <div className="sc-modal-overlay">
            <div className="sc-modal sc-details-modal">
              <div className="sc-modal-header">
                <h2>Project Details</h2>

                <button
                  type="button"
                  onClick={() => setViewingProject(null)}
                  className="sc-modal-close"
                >
                  &times;
                </button>
              </div>

              <div className="sc-project-details">
                <h3>
                  <i className="bi bi-kanban" />
                  {viewingProject.projectName}
                </h3>

                <div className="sc-detail-item">
                  <span><i className="bi bi-person" /> العميل</span>
                  <strong>{viewingProject.lead?.name || "-"}</strong>
                </div>

                <div className="sc-detail-item">
                  <span><i className="bi bi-envelope" /> البريد الإلكتروني</span>
                  <strong>{viewingProject.lead?.email || "-"}</strong>
                </div>

                <div className="sc-detail-item">
                  <span><i className="bi bi-telephone" /> رقم الهاتف</span>
                  <strong>{viewingProject.lead?.phone || "-"}</strong>
                </div>

                <div className="sc-detail-item">
                  <span><i className="bi bi-code-slash" /> الخدمة</span>
                  <strong>{viewingProject.service || "-"}</strong>
                </div>

                <div className="sc-detail-item">
                  <span><i className="bi bi-flag" /> الحالة</span>
                  <strong>{viewingProject.status || "-"}</strong>
                </div>

                <div className="sc-detail-item">
                  <span><i className="bi bi-cash-stack" /> قيمة العقد</span>
                  <strong>{Number(viewingProject.contractValue || 0).toLocaleString()} EGP</strong>
                </div>

                <div className="sc-detail-item">
                  <span><i className="bi bi-wallet2" /> المدفوع</span>
                  <strong>{Number(viewingProject.paidAmount || 0).toLocaleString()} EGP</strong>
                </div>

                <div className="sc-detail-item">
                  <span><i className="bi bi-hourglass-split" /> المتبقي</span>
                  <strong>
                    {(Number(viewingProject.contractValue || 0) -
                      Number(viewingProject.paidAmount || 0)).toLocaleString()} EGP
                  </strong>
                </div>

                <div className="sc-detail-item">
                  <span><i className="bi bi-graph-up" /> نسبة الإنجاز</span>
                  <strong>{viewingProject.progress || 0}%</strong>
                </div>

                <div className="sc-detail-item">
                  <span><i className="bi bi-person-workspace" /> المسؤول</span>
                  <strong>{viewingProject.assignedTo || "-"}</strong>
                </div>

                <div className="sc-detail-item">
                  <span><i className="bi bi-calendar-check" /> تاريخ البداية</span>
                  <strong>{formatDate(viewingProject.startDate)}</strong>
                </div>

                <div className="sc-detail-item">
                  <span><i className="bi bi-calendar-event" /> موعد التسليم</span>
                  <strong>{formatDate(viewingProject.deadline)}</strong>
                </div>

                <div className="sc-detail-item sc-detail-description">
                  <span><i className="bi bi-card-text" /> وصف المشروع</span>
                  <strong>{viewingProject.description || "لا يوجد وصف"}</strong>
                </div>
              </div>

              <div className="sc-project-details-actions">
                <button
                  type="button"
                  className="sc-edit-button"
                  onClick={() => {
                    startEditingProject(viewingProject);
                    setViewingProject(null);
                  }}
                >
                  <i className="bi bi-pencil-square" />
                  Edit Project
                </button>

                <button
                  type="button"
                  className="sc-cancel-button"
                  onClick={() => setViewingProject(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedProject && isEditingProject && (
          <div className="sc-modal-overlay">
            <section
              className="sc-details-modal sc-project-edit-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="sc-project-edit-title"
            >
              <div className="sc-modal-header">
                <h2 id="sc-project-edit-title">Edit Project</h2>

                <button
                  type="button"
                  className="sc-modal-close"
                  onClick={() => {
                    setIsEditingProject(false);
                    setSelectedProject(null);
                  }}
                  disabled={savingProject}
                  aria-label="Close project editor"
                >
                  <i className="bi bi-x-lg" />
                </button>
              </div>

              <div className="sc-project-edit-form">
                <label>
                  Project Name
                  <input
                    type="text"
                    value={projectEditForm.projectName}
                    onChange={(e) =>
                      setProjectEditForm({
                        ...projectEditForm,
                        projectName: e.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  Service
                  <select
                    value={projectEditForm.service}
                    onChange={(e) =>
                      setProjectEditForm({
                        ...projectEditForm,
                        service: e.target.value,
                      })
                    }
                  >
                    {[
                      "Web Development",
                      "Mobile App",
                      "E-Commerce",
                      "UI/UX Design",
                      "Digital Marketing",
                      "Other",
                    ].map((service) => (
                      <option key={service} value={service}>
                        {service}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Status
                  <select
                    value={projectEditForm.status}
                    onChange={(e) =>
                      setProjectEditForm({
                        ...projectEditForm,
                        status: e.target.value,
                      })
                    }
                  >
                    {[
                      "Pending",
                      "In Progress",
                      "On Hold",
                      "Review",
                      "Completed",
                      "Delivered",
                    ].map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Contract Value
                  <input
                    type="number"
                    min="0"
                    value={projectEditForm.contractValue}
                    onChange={(e) =>
                      setProjectEditForm({
                        ...projectEditForm,
                        contractValue: e.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  Paid Amount
                  <input
                    type="number"
                    min="0"
                    value={projectEditForm.paidAmount}
                    onChange={(e) =>
                      setProjectEditForm({
                        ...projectEditForm,
                        paidAmount: e.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  Start Date
                  <input
                    type="date"
                    value={projectEditForm.startDate}
                    onChange={(e) =>
                      setProjectEditForm({
                        ...projectEditForm,
                        startDate: e.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  Deadline
                  <input
                    type="date"
                    value={projectEditForm.deadline}
                    onChange={(e) =>
                      setProjectEditForm({
                        ...projectEditForm,
                        deadline: e.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  Progress (%)
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={projectEditForm.progress}
                    onChange={(e) =>
                      setProjectEditForm({
                        ...projectEditForm,
                        progress: e.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  Assigned To
                  <input
                    type="text"
                    value={projectEditForm.assignedTo}
                    onChange={(e) =>
                      setProjectEditForm({
                        ...projectEditForm,
                        assignedTo: e.target.value,
                      })
                    }
                  />
                </label>

                <label className="sc-project-edit-full">
                  Description
                  <textarea
                    rows="4"
                    value={projectEditForm.description}
                    onChange={(e) =>
                      setProjectEditForm({
                        ...projectEditForm,
                        description: e.target.value,
                      })
                    }
                  />
                </label>
              </div>

              <div className="sc-edit-actions">
                <button
                  type="button"
                  className="sc-cancel-edit"
                  onClick={() => {
                    setIsEditingProject(false);
                    setSelectedProject(null);
                  }}
                  disabled={savingProject}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="sc-save-edit"
                  onClick={saveProjectChanges}
                  disabled={savingProject}
                >
                  {savingProject ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </section>
          </div>
        )}
      </main>
      {projectToDelete && (
        <div className="sc-modal-overlay">
          <div className="sc-modal sc-delete-confirm-modal">
            <div className="sc-modal-header">
              <h2>Confirm Project Deletion</h2>

              <button
                type="button"
                className="sc-modal-close"
                onClick={() => setProjectToDelete(null)}
              >
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <div className="sc-delete-confirm-content">
              <i className="bi bi-exclamation-triangle" />

              <p>
                Are you sure you want to delete this project?
              </p>

              <strong>{projectToDelete.projectName}</strong>

              <small>This action cannot be undone.</small>
            </div>

            <div className="sc-project-details-actions">
              <button
                type="button"
                className="sc-cancel-button"
                onClick={() => setProjectToDelete(null)}
              >
                Cancel
              </button>

              <button
                type="button"
                className="sc-delete-button"
                disabled={deletingProjectIds.includes(projectToDelete._id)}
                onClick={async () => {
                  const id = projectToDelete._id;
                  const success = await deleteProject(id);

                  if (success) {
                    setProjectToDelete(null);
                  }
                }}
              >
                {deletingProjectIds.includes(projectToDelete._id) ? (
                  <>
                    <span className="sc-spinner" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <i className="bi bi-trash" />
                    Confirm Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
