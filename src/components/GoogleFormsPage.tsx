import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { User } from 'firebase/auth';
import {
  FileSpreadsheet,
  Plus,
  RefreshCw,
  ExternalLink,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  FileText,
  MessageSquare,
  Sparkles,
  LogOut,
  Search,
  ChevronRight,
  ShieldCheck,
  Edit3,
  ListChecks,
  HelpCircle,
} from 'lucide-react';
import {
  initAuth,
  googleSignIn,
  getAccessToken,
  logout,
} from '../utils/googleWorkspaceAuth';
import GoogleSignInButton from './GoogleSignInButton';

interface DriveFormFile {
  id: string;
  name: string;
  createdTime?: string;
  modifiedTime?: string;
  webViewLink?: string;
}

interface GoogleFormOption {
  value: string;
}

interface GoogleFormQuestionItem {
  question?: {
    questionId?: string;
    required?: boolean;
    choiceQuestion?: {
      type?: 'RADIO' | 'CHECKBOX' | 'DROP_DOWN';
      options?: GoogleFormOption[];
    };
    textQuestion?: {
      paragraph?: boolean;
    };
    scaleQuestion?: {
      low?: number;
      high?: number;
      lowLabel?: string;
      highLabel?: string;
    };
  };
}

interface GoogleFormItem {
  itemId?: string;
  title?: string;
  description?: string;
  questionItem?: GoogleFormQuestionItem;
}

interface GoogleFormDetail {
  formId: string;
  info: {
    title: string;
    documentTitle?: string;
    description?: string;
  };
  responderUri?: string;
  items?: GoogleFormItem[];
}

interface GoogleFormResponseAnswer {
  questionId: string;
  textAnswers?: {
    answers?: Array<{ value: string }>;
  };
}

interface GoogleFormResponse {
  responseId: string;
  createTime: string;
  lastSubmittedTime: string;
  respondentEmail?: string;
  answers?: Record<string, GoogleFormResponseAnswer>;
}

interface DraftQuestion {
  id: string;
  title: string;
  type: 'RADIO' | 'CHECKBOX' | 'TEXT' | 'PARAGRAPH';
  required: boolean;
  optionsText: string;
}

interface DispensaryFormTemplate {
  id: string;
  badge: string;
  title: string;
  description: string;
  formDescription: string;
  questions: Array<{
    title: string;
    required: boolean;
    type: 'RADIO' | 'CHECKBOX' | 'TEXT' | 'PARAGRAPH';
    options?: string[];
  }>;
}

const DISPENSARY_TEMPLATES: DispensaryFormTemplate[] = [
  {
    id: 'strain-consultation',
    badge: 'Patient & Connoisseur Intake',
    title: 'Global Herbs Strain & Terpene Consultation Form',
    description:
      'Collect patient & connoisseur preferences on desired effects, cannabinoid ratios, terpene profiles, and consumption formats.',
    formDescription:
      'Complete this consultation form so our Global Herbs formulary specialists can recommend lab-tested THCa flower, solventless rosin, or CBD tinctures tailored to your goals.',
    questions: [
      {
        title: 'What are your primary wellness or recreational goals?',
        required: true,
        type: 'CHECKBOX',
        options: [
          'Deep Evening Relaxation & Sleep Support',
          'Daytime Creative Focus & Uplift',
          'Physical Recovery & Soothing Comfort',
          'Balanced Full-Spectrum Calm (CBD / Low-THC)',
        ],
      },
      {
        title: 'Which Global Herbs product categories do you prefer?',
        required: true,
        type: 'CHECKBOX',
        options: [
          'Indoor Living-Soil THCa Flower',
          'Solventless Live Hash Rosin & Concentrates',
          'Live Resin Disposable Vape Carts',
          'Full-Spectrum Edibles & Gummies',
          'CBD Wellness Tinctures & Drops',
        ],
      },
      {
        title: 'Preferred Terpene & Flavor Profile',
        required: false,
        type: 'RADIO',
        options: [
          'Citrus & Tropical (Limonene / Valencene)',
          'Earthy Pine & Kush (Myrcene / Pinene)',
          'Sweet Berry & Dessert (Linalool / Caryophyllene)',
          'Gas, Diesel & Skunk (Humulene / Beta-Caryophyllene)',
        ],
      },
      {
        title: 'Any specific potency preferences, sensitivities, or questions for our team?',
        required: false,
        type: 'PARAGRAPH',
      },
    ],
  },
  {
    id: 'wholesale-intake',
    badge: 'B2B & Bulk Distribution',
    title: 'Global Herbs Wholesale & Bulk Purchaser Application',
    description:
      'Qualify bulk buyers and retail partners with structured questions on monthly volume tiers, product lines, and settlement methods.',
    formDescription:
      'Apply for a Global Herbs Wholesale & Bulk Distribution account. All bulk shipments include batch-specific third-party Certificates of Analysis (COAs) and discreet vacuum-sealed logistics.',
    questions: [
      {
        title: 'Organization / Collective Name & Contact Person',
        required: true,
        type: 'TEXT',
      },
      {
        title: 'Estimated Monthly Purchasing Volume Tier',
        required: true,
        type: 'RADIO',
        options: [
          '$1,000 – $2,500 / month (Starter Bulk Tier)',
          '$2,500 – $10,000 / month (Mid-Volume Partner)',
          '$10,000+ / month (Enterprise / Master Distributor)',
        ],
      },
      {
        title: 'Categories Requested for Wholesale Allocation',
        required: true,
        type: 'CHECKBOX',
        options: [
          'Bulk Pound / Half-Pound THCa Flower',
          'Solventless Rosin & Concentrate Jars',
          '100+ Unit Vape Cartridge Lots',
          'Pre-Packaged Edibles & Pre-Roll Multipacks',
        ],
      },
      {
        title: 'Delivery Destination State / Country & Special Logistics Notes',
        required: true,
        type: 'PARAGRAPH',
      },
    ],
  },
  {
    id: 'order-coa-feedback',
    badge: 'Quality Assurance & Stealth Audit',
    title: 'Global Herbs Order Experience & COA Verification Survey',
    description:
      'Gather verified buyer feedback on stealth vacuum packaging, transit speed, terpene freshness, and lab report transparency.',
    formDescription:
      'Thank you for ordering from Global Herbs Dispensary. Your feedback helps our Cave Junction dispatch center maintain 100% discreet delivery and uncompromising botanical quality.',
    questions: [
      {
        title: 'Order Reference Number (Optional)',
        required: false,
        type: 'TEXT',
      },
      {
        title: 'How would you rate our multi-layer vacuum-sealed stealth packaging?',
        required: true,
        type: 'RADIO',
        options: [
          '5/5 — Completely Odor-Proof & Discreet',
          '4/5 — Very Good Packaging',
          '3/5 — Acceptable',
          'Needs Improvement',
        ],
      },
      {
        title: 'How satisfied are you with the flower curing, terpene aroma, and lab COA accuracy?',
        required: true,
        type: 'RADIO',
        options: [
          'Exceeds Expectations — Connoisseur Grade',
          'Meets Expectations — Clean & Potent',
          'Neutral',
          'Below Expectations',
        ],
      },
      {
        title: 'Which strain or product was your favorite, and what would you like us to stock next?',
        required: false,
        type: 'PARAGRAPH',
      },
    ],
  },
];

interface ConfirmModalState {
  isOpen: boolean;
  title: string;
  description: string;
  details?: string[];
  confirmLabel: string;
  isDestructive?: boolean;
  onConfirm: () => Promise<void>;
}

export default function GoogleFormsPage() {
  const [needsAuth, setNeedsAuth] = useState<boolean>(true);
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  // Forms list from Drive
  const [formsList, setFormsList] = useState<DriveFormFile[]>([]);
  const [isLoadingForms, setIsLoadingForms] = useState<boolean>(false);
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [manualFormIdInput, setManualFormIdInput] = useState<string>('');

  // Selected form & responses
  const [selectedForm, setSelectedForm] = useState<GoogleFormDetail | null>(null);
  const [formResponses, setFormResponses] = useState<GoogleFormResponse[]>([]);
  const [isLoadingDetail, setIsLoadingDetail] = useState<boolean>(false);
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<'my-forms' | 'templates' | 'builder'>('my-forms');
  const [detailViewMode, setDetailViewMode] = useState<'questions' | 'responses'>('questions');

  // Custom Form Builder State
  const [customTitle, setCustomTitle] = useState<string>('Global Herbs Custom Member Survey');
  const [customDescription, setCustomDescription] = useState<string>(
    'Share your botanical preferences and feedback with the Global Herbs Dispensary team.'
  );
  const [draftQuestions, setDraftQuestions] = useState<DraftQuestion[]>([
    {
      id: 'q-1',
      title: 'Which product department do you shop most frequently?',
      type: 'RADIO',
      required: true,
      optionsText: 'THCa Flowers, Live Resin Vapes, Edibles, Concentrates, CBD Wellness',
    },
    {
      id: 'q-2',
      title: 'Any questions or special requests for our dispensary team?',
      type: 'PARAGRAPH',
      required: false,
      optionsText: '',
    },
  ]);

  // Add single question to existing form state
  const [newQuestionTitle, setNewQuestionTitle] = useState<string>('');
  const [newQuestionType, setNewQuestionType] = useState<'RADIO' | 'CHECKBOX' | 'TEXT' | 'PARAGRAPH'>('TEXT');
  const [newQuestionOptions, setNewQuestionOptions] = useState<string>('Option 1, Option 2, Option 3');
  const [newQuestionRequired, setNewQuestionRequired] = useState<boolean>(false);

  // Edit existing form title/description state
  const [isEditingFormInfo, setIsEditingFormInfo] = useState<boolean>(false);
  const [editFormTitle, setEditFormTitle] = useState<string>('');
  const [editFormDescription, setEditFormDescription] = useState<string>('');

  // Status banner & copy state
  const [statusBanner, setStatusBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);
  const [isMutating, setIsMutating] = useState<boolean>(false);

  // Mandatory User Confirmation Modal state for mutating/destructive operations
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState | null>(null);

  const fetchUserForms = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) {
      setNeedsAuth(true);
      return;
    }

    setIsLoadingForms(true);
    try {
      const query = encodeURIComponent("mimeType='application/vnd.google-apps.form' and trashed=false");
      const fields = encodeURIComponent('files(id,name,createdTime,modifiedTime,webViewLink)');
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}&orderBy=modifiedTime desc&pageSize=30`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.status === 401 || res.status === 403) {
        setNeedsAuth(true);
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to load Google Forms from Drive.');
      }

      const files: DriveFormFile[] = Array.isArray(data.files) ? data.files : [];
      setFormsList(files);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to fetch forms.';
      setStatusBanner({ type: 'error', message: msg });
    } finally {
      setIsLoadingForms(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = initAuth(
      (user) => {
        setGoogleUser(user);
        setNeedsAuth(false);
        fetchUserForms();
      },
      () => {
        setGoogleUser(null);
        setNeedsAuth(true);
      }
    );
    return () => unsubscribe();
  }, [fetchUserForms]);

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setStatusBanner(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setGoogleUser(result.user);
        setNeedsAuth(false);
        await fetchUserForms();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google Sign-In was cancelled or failed.';
      setStatusBanner({ type: 'error', message: msg });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleLogout = async () => {
    await logout();
    setGoogleUser(null);
    setNeedsAuth(true);
    setSelectedForm(null);
    setFormResponses([]);
    setFormsList([]);
  };

  // Extract formId if user pastes a full Google Forms URL or raw ID
  const parseFormId = (raw: string): string => {
    const trimmed = raw.trim();
    const match = trimmed.match(/\/forms\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) return match[1];
    return trimmed;
  };

  const loadFormDetailsAndResponses = async (rawFormId: string) => {
    const formId = parseFormId(rawFormId);
    if (!formId) return;

    const token = await getAccessToken();
    if (!token) {
      setNeedsAuth(true);
      return;
    }

    setIsLoadingDetail(true);
    setStatusBanner(null);
    try {
      const [formRes, responsesRes] = await Promise.all([
        fetch(`https://forms.googleapis.com/v1/forms/${encodeURIComponent(formId)}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`https://forms.googleapis.com/v1/forms/${encodeURIComponent(formId)}/responses`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (formRes.status === 401) {
        setNeedsAuth(true);
        return;
      }

      const formData = await formRes.json();
      if (!formRes.ok) {
        throw new Error(formData.error?.message || 'Could not load the specified Google Form.');
      }

      setSelectedForm(formData as GoogleFormDetail);
      setEditFormTitle(formData.info?.title || '');
      setEditFormDescription(formData.info?.description || '');
      setIsEditingFormInfo(false);

      if (responsesRes.ok) {
        const respData = await responsesRes.json();
        setFormResponses(Array.isArray(respData.responses) ? respData.responses : []);
      } else {
        setFormResponses([]);
      }
      setActiveWorkspaceTab('my-forms');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error loading Google Form details.';
      setStatusBanner({ type: 'error', message: msg });
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // Build Google Forms API batchUpdate requests for questions
  const buildBatchUpdateRequests = (
    description: string,
    questions: Array<{
      title: string;
      required: boolean;
      type: 'RADIO' | 'CHECKBOX' | 'TEXT' | 'PARAGRAPH';
      options?: string[];
    }>
  ) => {
    const requests: Array<Record<string, unknown>> = [];

    if (description.trim()) {
      requests.push({
        updateFormInfo: {
          info: { description: description.trim() },
          updateMask: 'description',
        },
      });
    }

    questions.forEach((q, idx) => {
      if (!q.title.trim()) return;

      let questionPayload: Record<string, unknown> = {
        required: q.required,
      };

      if (q.type === 'RADIO' || q.type === 'CHECKBOX') {
        const cleanedOptions = (q.options || [])
          .map((o) => o.trim())
          .filter(Boolean)
          .map((value) => ({ value }));
        questionPayload = {
          ...questionPayload,
          choiceQuestion: {
            type: q.type,
            options: cleanedOptions.length > 0 ? cleanedOptions : [{ value: 'Option 1' }],
          },
        };
      } else {
        questionPayload = {
          ...questionPayload,
          textQuestion: {
            paragraph: q.type === 'PARAGRAPH',
          },
        };
      }

      requests.push({
        createItem: {
          item: {
            title: q.title.trim(),
            questionItem: {
              question: questionPayload,
            },
          },
          location: { index: idx },
        },
      });
    });

    return requests;
  };

  // Create a Google Form (Used by both Templates and Custom Builder, with mandatory user confirmation)
  const requestCreateGoogleForm = (
    title: string,
    description: string,
    questions: Array<{
      title: string;
      required: boolean;
      type: 'RADIO' | 'CHECKBOX' | 'TEXT' | 'PARAGRAPH';
      options?: string[];
    }>
  ) => {
    if (!title.trim()) {
      setStatusBanner({ type: 'error', message: 'Please provide a form title before creating.' });
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: `Create New Google Form: "${title.trim()}"?`,
      description:
        'This action will create a new Google Form in your connected Google Workspace account and populate it with the following questions:',
      details: questions.map((q, i) => `${i + 1}. ${q.title} (${q.type})`),
      confirmLabel: 'Confirm & Create Form',
      isDestructive: false,
      onConfirm: async () => {
        const token = await getAccessToken();
        if (!token) {
          setNeedsAuth(true);
          return;
        }

        setIsMutating(true);
        setStatusBanner(null);
        try {
          // Step 1: Create the form with info.title
          const createRes = await fetch('https://forms.googleapis.com/v1/forms', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              info: {
                title: title.trim(),
                documentTitle: title.trim(),
              },
            }),
          });

          const createdForm = await createRes.json();
          if (!createRes.ok) {
            throw new Error(createdForm.error?.message || 'Failed to create Google Form.');
          }

          const newFormId: string = createdForm.formId;

          // Step 2: Populate description and questions via batchUpdate
          const requests = buildBatchUpdateRequests(description, questions);
          if (requests.length > 0) {
            const batchRes = await fetch(
              `https://forms.googleapis.com/v1/forms/${encodeURIComponent(newFormId)}:batchUpdate`,
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  includeFormInResponse: true,
                  requests,
                }),
              }
            );
            const batchData = await batchRes.json();
            if (!batchRes.ok) {
              throw new Error(batchData.error?.message || 'Form created, but adding questions failed.');
            }
          }

          setStatusBanner({
            type: 'success',
            message: `Successfully created "${title.trim()}" in your Google Forms account!`,
          });

          await fetchUserForms();
          await loadFormDetailsAndResponses(newFormId);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Failed to create Google Form.';
          setStatusBanner({ type: 'error', message: msg });
        } finally {
          setIsMutating(false);
        }
      },
    });
  };

  // Update existing form's title/description (with mandatory confirmation)
  const requestUpdateFormInfo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedForm) return;

    setConfirmModal({
      isOpen: true,
      title: `Update Form Details for "${selectedForm.info.title}"?`,
      description:
        'This will overwrite the existing title and description of this Google Form in your Google account.',
      details: [
        `New Title: ${editFormTitle.trim() || 'Untitled Form'}`,
        `New Description: ${editFormDescription.trim() || '(No description)'}`,
      ],
      confirmLabel: 'Confirm Update',
      isDestructive: false,
      onConfirm: async () => {
        const token = await getAccessToken();
        if (!token) {
          setNeedsAuth(true);
          return;
        }

        setIsMutating(true);
        setStatusBanner(null);
        try {
          const res = await fetch(
            `https://forms.googleapis.com/v1/forms/${encodeURIComponent(selectedForm.formId)}:batchUpdate`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                includeFormInResponse: true,
                requests: [
                  {
                    updateFormInfo: {
                      info: {
                        title: editFormTitle.trim() || 'Untitled Form',
                        description: editFormDescription.trim(),
                      },
                      updateMask: 'title,description',
                    },
                  },
                ],
              }),
            }
          );

          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error?.message || 'Failed to update form info.');
          }

          setIsEditingFormInfo(false);
          setStatusBanner({
            type: 'success',
            message: 'Form title and description updated in Google Forms.',
          });
          await loadFormDetailsAndResponses(selectedForm.formId);
          await fetchUserForms();
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Failed to update form info.';
          setStatusBanner({ type: 'error', message: msg });
        } finally {
          setIsMutating(false);
        }
      },
    });
  };

  // Append a new question to the currently selected form (with mandatory confirmation)
  const requestAddQuestionToForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedForm || !newQuestionTitle.trim()) return;

    const currentItemCount = selectedForm.items ? selectedForm.items.length : 0;
    const optionsArray = newQuestionOptions
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    setConfirmModal({
      isOpen: true,
      title: `Add Question to "${selectedForm.info.title}"?`,
      description: 'This will modify your live Google Form by appending the following question:',
      details: [
        `Question: ${newQuestionTitle.trim()}`,
        `Type: ${newQuestionType}`,
        `Required: ${newQuestionRequired ? 'Yes' : 'No'}`,
      ],
      confirmLabel: 'Confirm & Add Question',
      isDestructive: false,
      onConfirm: async () => {
        const token = await getAccessToken();
        if (!token) {
          setNeedsAuth(true);
          return;
        }

        setIsMutating(true);
        setStatusBanner(null);
        try {
          const singleQuestionRequest = buildBatchUpdateRequests('', [
            {
              title: newQuestionTitle.trim(),
              required: newQuestionRequired,
              type: newQuestionType,
              options: optionsArray,
            },
          ]);

          // Adjust location index to append at the end of existing items
          if (singleQuestionRequest[0] && 'createItem' in singleQuestionRequest[0]) {
            (singleQuestionRequest[0].createItem as { location: { index: number } }).location.index =
              currentItemCount;
          }

          const res = await fetch(
            `https://forms.googleapis.com/v1/forms/${encodeURIComponent(selectedForm.formId)}:batchUpdate`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                includeFormInResponse: true,
                requests: singleQuestionRequest,
              }),
            }
          );

          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error?.message || 'Failed to add question to form.');
          }

          setNewQuestionTitle('');
          setStatusBanner({
            type: 'success',
            message: 'New question added to your Google Form.',
          });
          await loadFormDetailsAndResponses(selectedForm.formId);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Failed to add question.';
          setStatusBanner({ type: 'error', message: msg });
        } finally {
          setIsMutating(false);
        }
      },
    });
  };

  // Delete a Google Form via Google Drive API (with mandatory destructive confirmation dialog)
  const requestDeleteForm = (formId: string, formName: string) => {
    setConfirmModal({
      isOpen: true,
      title: `Permanently Delete "${formName}" from Google Drive?`,
      description:
        'Are you sure you want to permanently delete this Google Form and all of its configuration? This action cannot be undone.',
      details: [`Form Name: ${formName}`, `Form ID: ${formId}`],
      confirmLabel: 'Delete Google Form',
      isDestructive: true,
      onConfirm: async () => {
        const token = await getAccessToken();
        if (!token) {
          setNeedsAuth(true);
          return;
        }

        setIsMutating(true);
        setStatusBanner(null);
        try {
          const res = await fetch(
            `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(formId)}`,
            {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          if (!res.ok && res.status !== 204) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error?.message || 'Failed to delete Google Form.');
          }

          if (selectedForm?.formId === formId) {
            setSelectedForm(null);
            setFormResponses([]);
          }

          setStatusBanner({
            type: 'success',
            message: `Deleted "${formName}" from Google Drive.`,
          });
          await fetchUserForms();
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Failed to delete form.';
          setStatusBanner({ type: 'error', message: msg });
        } finally {
          setIsMutating(false);
        }
      },
    });
  };

  const copyResponderLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  const filteredForms = formsList.filter((f) =>
    f.name.toLowerCase().includes(searchFilter.toLowerCase())
  );

  // Map questionId -> question title for displaying responses cleanly
  const questionTitleMap: Record<string, string> = {};
  if (selectedForm?.items) {
    selectedForm.items.forEach((item) => {
      const qId = item.questionItem?.question?.questionId;
      if (qId && item.title) {
        questionTitleMap[qId] = item.title;
      }
    });
  }

  return (
    <div className="min-h-screen bg-gray-50/60 pb-20 text-left">
      {/* Hero Header */}
      <section className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-zinc-900 text-white py-12 px-4 border-b border-emerald-800/40">
        <div className="max-w-7xl mx-auto">
          <nav
            aria-label="Breadcrumb"
            className="text-[11px] font-bold text-emerald-300/80 uppercase tracking-widest mb-3 flex items-center gap-1.5"
          >
            <Link to="/" className="hover:text-white transition">
              Home
            </Link>
            <ChevronRight size={12} />
            <span className="text-white">Google Forms Workspace Hub</span>
          </nav>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 text-xs font-bold uppercase tracking-wider mb-3">
                <FileSpreadsheet size={14} />
                <span>Live Google Forms &amp; Drive API Integration</span>
              </div>
              <h1 className="font-heading font-extrabold text-2xl sm:text-4xl tracking-tight text-white">
                Global Herbs Google Forms Studio
              </h1>
              <p className="text-emerald-100/90 text-xs sm:text-sm mt-2 leading-relaxed font-medium">
                Create, customize, and review live Google Forms for patient strain consultations, wholesale applications, and COA verification surveys directly from your Google Workspace account.
              </p>
            </div>

            {/* Auth Status Pill / Sign Out */}
            {!needsAuth && googleUser && (
              <div className="bg-white/10 backdrop-blur-xs border border-white/15 rounded-2xl p-4 flex items-center gap-3.5 self-start md:self-auto">
                {googleUser.photoURL ? (
                  <img
                    src={googleUser.photoURL}
                    alt={googleUser.displayName || 'Google User'}
                    className="w-10 h-10 rounded-full border border-emerald-400/50"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-sm">
                    {googleUser.email?.charAt(0).toUpperCase() || 'G'}
                  </div>
                )}
                <div className="text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="font-bold text-white">
                      {googleUser.displayName || 'Connected Workspace Account'}
                    </span>
                  </div>
                  <p className="text-emerald-200 text-[11px]">{googleUser.email}</p>
                </div>
                <button
                  type="button"
                  onClick={handleGoogleLogout}
                  className="ml-2 px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 text-red-100 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <LogOut size={13} />
                  <span>Disconnect</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 pt-8">
        {/* Feedback Alert Banner */}
        {statusBanner && (
          <div
            className={`mb-6 p-4 rounded-2xl border flex items-start justify-between gap-3 text-xs font-semibold shadow-2xs ${
              statusBanner.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                : 'bg-rose-50 border-rose-200 text-rose-950'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {statusBanner.type === 'success' ? (
                <CheckCircle2 size={18} className="text-emerald-700 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={18} className="text-rose-700 flex-shrink-0 mt-0.5" />
              )}
              <span>{statusBanner.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setStatusBanner(null)}
              className="text-gray-400 hover:text-gray-700 font-bold text-xs cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Authentication Gate when needsAuth is true */}
        {needsAuth ? (
          <div className="bg-white border border-gray-200 rounded-3xl shadow-sm p-8 sm:p-12 max-w-2xl mx-auto my-6 text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center mx-auto shadow-2xs">
              <FileSpreadsheet size={32} />
            </div>

            <div className="space-y-2">
              <span className="inline-block text-[11px] font-bold uppercase tracking-widest text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full">
                Google Workspace OAuth Required
              </span>
              <h2 className="font-heading font-bold text-xl sm:text-2xl text-gray-900">
                Connect Your Google Forms Account
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 max-w-lg mx-auto leading-relaxed">
                Sign in with Google to browse your existing Google Forms, launch pre-built Global Herbs consultation &amp; survey templates, edit form questions, and inspect live respondent submissions.
              </p>
            </div>

            <div className="flex flex-col items-center justify-center gap-3 pt-2">
              <GoogleSignInButton
                onClick={handleGoogleLogin}
                disabled={isLoggingIn}
                label={isLoggingIn ? 'Connecting to Google...' : 'Sign in with Google'}
              />
              <p className="text-[11px] text-gray-400 flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-700" />
                <span>Access tokens are cached strictly in memory and cleared automatically on sign-out.</span>
              </p>
            </div>

            <div className="pt-6 border-t border-gray-100 grid sm:grid-cols-3 gap-4 text-left text-xs">
              <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-1 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-emerald-700" />
                  <span>1-Click Templates</span>
                </h3>
                <p className="text-gray-500 text-[11px] leading-relaxed">
                  Deploy Strain Consultation, Wholesale Intake, or COA Feedback forms directly to your Drive.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-1 flex items-center gap-1.5">
                  <ListChecks size={14} className="text-emerald-700" />
                  <span>Live Question Editor</span>
                </h3>
                <p className="text-gray-500 text-[11px] leading-relaxed">
                  Inspect questions, copy responder links, and append new fields to any Google Form.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-1 flex items-center gap-1.5">
                  <MessageSquare size={14} className="text-emerald-700" />
                  <span>Response Analytics</span>
                </h3>
                <p className="text-gray-500 text-[11px] leading-relaxed">
                  Read real-time customer and patient form submissions without leaving Global Herbs.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Authenticated Google Forms Workspace Studio */
          <div className="space-y-6">
            {/* Navigation Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 pb-4">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveWorkspaceTab('my-forms')}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center gap-2 cursor-pointer ${
                    activeWorkspaceTab === 'my-forms'
                      ? 'bg-emerald-800 text-white shadow-xs'
                      : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <FileText size={15} />
                  <span>My Google Forms &amp; Responses ({formsList.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveWorkspaceTab('templates')}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center gap-2 cursor-pointer ${
                    activeWorkspaceTab === 'templates'
                      ? 'bg-emerald-800 text-white shadow-xs'
                      : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Sparkles size={15} />
                  <span>Dispensary Form Templates</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveWorkspaceTab('builder')}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center gap-2 cursor-pointer ${
                    activeWorkspaceTab === 'builder'
                      ? 'bg-emerald-800 text-white shadow-xs'
                      : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Plus size={15} />
                  <span>Custom Form Builder</span>
                </button>
              </div>

              <button
                type="button"
                onClick={fetchUserForms}
                disabled={isLoadingForms}
                className="px-3.5 py-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
              >
                <RefreshCw size={14} className={isLoadingForms ? 'animate-spin text-emerald-700' : 'text-emerald-700'} />
                <span>Refresh Drive Forms</span>
              </button>
            </div>

            {/* TAB 1: MY GOOGLE FORMS & INSPECTOR */}
            {activeWorkspaceTab === 'my-forms' && (
              <div className="grid lg:grid-cols-12 gap-6 items-start">
                {/* Left Sidebar: Forms List & Direct ID Lookup */}
                <div className="lg:col-span-4 bg-white border border-gray-200 rounded-2xl p-5 shadow-2xs space-y-4">
                  <div>
                    <h2 className="font-heading font-bold text-sm uppercase tracking-wider text-gray-900">
                      Your Google Drive Forms
                    </h2>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Select a form to view questions, share responder links, or inspect submissions.
                    </p>
                  </div>

                  {/* Search Filter */}
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="search"
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      placeholder="Filter forms by name..."
                      className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-700"
                    />
                  </div>

                  {/* Load by Form ID or URL */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (manualFormIdInput.trim()) {
                        loadFormDetailsAndResponses(manualFormIdInput);
                      }
                    }}
                    className="flex gap-1.5"
                  >
                    <input
                      type="text"
                      value={manualFormIdInput}
                      onChange={(e) => setManualFormIdInput(e.target.value)}
                      placeholder="Paste Form ID or URL..."
                      className="flex-grow px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-700"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                    >
                      Open
                    </button>
                  </form>

                  {/* List of Forms */}
                  {isLoadingForms ? (
                    <div className="py-12 text-center text-xs text-gray-400 space-y-2">
                      <RefreshCw size={20} className="animate-spin mx-auto text-emerald-700" />
                      <p>Loading forms from Google Drive...</p>
                    </div>
                  ) : filteredForms.length === 0 ? (
                    <div className="py-10 px-4 text-center bg-gray-50 rounded-xl border border-gray-100 space-y-3">
                      <FileSpreadsheet size={28} className="text-gray-300 mx-auto" />
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-gray-700">No Google Forms Found</p>
                        <p className="text-[11px] text-gray-500">
                          Launch a pre-built Global Herbs template or create a custom form to get started.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveWorkspaceTab('templates')}
                        className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl transition cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <Sparkles size={13} />
                        <span>Browse Templates</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                      {filteredForms.map((file) => {
                        const isSelected = selectedForm?.formId === file.id;
                        return (
                          <div
                            key={file.id}
                            className={`group p-3 rounded-xl border transition flex items-center justify-between gap-2 ${
                              isSelected
                                ? 'bg-emerald-50/90 border-emerald-600 text-emerald-950'
                                : 'bg-gray-50/70 hover:bg-white border-gray-200 text-gray-800'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => loadFormDetailsAndResponses(file.id)}
                              className="flex-grow text-left min-w-0 cursor-pointer"
                            >
                              <p className="font-bold text-xs truncate">{file.name}</p>
                              {file.modifiedTime && (
                                <p className="text-[10px] text-gray-400 mt-0.5">
                                  Updated {new Date(file.modifiedTime).toLocaleDateString()}
                                </p>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => requestDeleteForm(file.id, file.name)}
                              title="Delete Form from Google Drive"
                              className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer flex-shrink-0"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Right Column: Active Form Detail & Responses */}
                <div className="lg:col-span-8">
                  {isLoadingDetail ? (
                    <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center space-y-3">
                      <RefreshCw size={28} className="animate-spin text-emerald-700 mx-auto" />
                      <p className="text-xs font-bold text-gray-600">
                        Loading Google Form structure &amp; responses...
                      </p>
                    </div>
                  ) : !selectedForm ? (
                    <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center space-y-4">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center mx-auto">
                        <FileText size={24} />
                      </div>
                      <div className="max-w-md mx-auto space-y-1">
                        <h3 className="font-heading font-bold text-base text-gray-900">
                          Select or Create a Google Form
                        </h3>
                        <p className="text-xs text-gray-500 leading-relaxed">
                          Choose any form from your Google Drive list on the left, or launch one of our ready-to-use Global Herbs dispensary forms.
                        </p>
                      </div>
                      <div className="flex flex-wrap justify-center gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setActiveWorkspaceTab('templates')}
                          className="px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
                        >
                          <Sparkles size={14} />
                          <span>Use a Dispensary Template</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveWorkspaceTab('builder')}
                          className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
                        >
                          <Plus size={14} />
                          <span>Build Custom Form</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white border border-gray-200 rounded-2xl shadow-2xs overflow-hidden">
                      {/* Selected Form Header */}
                      <div className="bg-gradient-to-r from-emerald-950 to-emerald-900 text-white p-6">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                          <div className="space-y-1">
                            <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-300 bg-white/10 px-2.5 py-0.5 rounded-md">
                              Form ID: {selectedForm.formId}
                            </span>
                            <h2 className="font-heading font-bold text-xl text-white pt-1">
                              {selectedForm.info?.title || 'Untitled Form'}
                            </h2>
                            {selectedForm.info?.description && (
                              <p className="text-xs text-emerald-100/90 leading-relaxed max-w-2xl">
                                {selectedForm.info.description}
                              </p>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => setIsEditingFormInfo(!isEditingFormInfo)}
                              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                            >
                              <Edit3 size={13} />
                              <span>Edit Info</span>
                            </button>
                            {selectedForm.responderUri && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => copyResponderLink(selectedForm.responderUri!)}
                                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                                >
                                  {copiedUrl ? <Check size={13} /> : <Copy size={13} />}
                                  <span>{copiedUrl ? 'Copied Link!' : 'Copy Link'}</span>
                                </button>
                                <a
                                  href={selectedForm.responderUri}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-emerald-950 text-xs font-bold flex items-center gap-1.5 transition"
                                >
                                  <span>Open Live Form</span>
                                  <ExternalLink size={13} />
                                </a>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Inline Edit Form Title & Description */}
                        {isEditingFormInfo && (
                          <form
                            onSubmit={requestUpdateFormInfo}
                            className="mt-4 pt-4 border-t border-white/15 space-y-3 text-xs"
                          >
                            <div className="grid sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-emerald-200 mb-1">
                                  Form Title
                                </label>
                                <input
                                  type="text"
                                  required
                                  value={editFormTitle}
                                  onChange={(e) => setEditFormTitle(e.target.value)}
                                  className="w-full px-3 py-2 rounded-xl bg-white text-gray-900 font-semibold focus:outline-none"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-emerald-200 mb-1">
                                  Description
                                </label>
                                <input
                                  type="text"
                                  value={editFormDescription}
                                  onChange={(e) => setEditFormDescription(e.target.value)}
                                  className="w-full px-3 py-2 rounded-xl bg-white text-gray-900 font-semibold focus:outline-none"
                                />
                              </div>
                            </div>
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setIsEditingFormInfo(false)}
                                className="px-3 py-1.5 rounded-lg bg-white/10 text-white font-bold cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                className="px-4 py-1.5 rounded-lg bg-emerald-400 text-emerald-950 font-bold cursor-pointer"
                              >
                                Save Form Info
                              </button>
                            </div>
                          </form>
                        )}
                      </div>

                      {/* Sub-tabs: Questions vs Responses */}
                      <div className="flex border-b border-gray-200 bg-gray-50 px-6 text-xs font-bold uppercase tracking-wider">
                        <button
                          type="button"
                          onClick={() => setDetailViewMode('questions')}
                          className={`py-3.5 px-4 border-b-2 transition flex items-center gap-2 cursor-pointer ${
                            detailViewMode === 'questions'
                              ? 'border-emerald-800 text-emerald-900 bg-white'
                              : 'border-transparent text-gray-500 hover:text-gray-800'
                          }`}
                        >
                          <ListChecks size={15} />
                          <span>Questions ({selectedForm.items?.length || 0})</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDetailViewMode('responses')}
                          className={`py-3.5 px-4 border-b-2 transition flex items-center gap-2 cursor-pointer ${
                            detailViewMode === 'responses'
                              ? 'border-emerald-800 text-emerald-900 bg-white'
                              : 'border-transparent text-gray-500 hover:text-gray-800'
                          }`}
                        >
                          <MessageSquare size={15} />
                          <span>Submitted Responses ({formResponses.length})</span>
                        </button>
                      </div>

                      <div className="p-6">
                        {detailViewMode === 'questions' ? (
                          <div className="space-y-6">
                            {/* Existing Questions List */}
                            {!selectedForm.items || selectedForm.items.length === 0 ? (
                              <div className="p-6 bg-gray-50 rounded-xl border border-gray-100 text-center text-xs text-gray-500">
                                This form does not have any questions yet. Add a question below!
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {selectedForm.items.map((item, idx) => {
                                  const q = item.questionItem?.question;
                                  const choiceQ = q?.choiceQuestion;
                                  const textQ = q?.textQuestion;

                                  return (
                                    <div
                                      key={item.itemId || idx}
                                      className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-2"
                                    >
                                      <div className="flex items-start justify-between gap-2">
                                        <h4 className="font-bold text-xs sm:text-sm text-gray-900">
                                          {idx + 1}. {item.title || 'Untitled Item'}
                                          {q?.required && (
                                            <span className="text-rose-600 ml-1 font-bold">*</span>
                                          )}
                                        </h4>
                                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                                          {choiceQ
                                            ? choiceQ.type
                                            : textQ?.paragraph
                                            ? 'PARAGRAPH'
                                            : 'SHORT ANSWER'}
                                        </span>
                                      </div>

                                      {item.description && (
                                        <p className="text-xs text-gray-500">{item.description}</p>
                                      )}

                                      {choiceQ?.options && choiceQ.options.length > 0 && (
                                        <ul className="space-y-1.5 pt-1 pl-1">
                                          {choiceQ.options.map((opt, oIdx) => (
                                            <li
                                              key={oIdx}
                                              className="text-xs text-gray-700 flex items-center gap-2"
                                            >
                                              <span
                                                className={`w-3.5 h-3.5 border border-gray-300 inline-block bg-white ${
                                                  choiceQ.type === 'RADIO' ? 'rounded-full' : 'rounded-xs'
                                                }`}
                                              />
                                              <span>{opt.value}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* Append New Question Form */}
                            <form
                              onSubmit={requestAddQuestionToForm}
                              className="p-5 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 space-y-4"
                            >
                              <h4 className="font-heading font-bold text-xs uppercase tracking-wider text-emerald-950 flex items-center gap-1.5">
                                <Plus size={15} className="text-emerald-700" />
                                <span>Add New Question to This Form</span>
                              </h4>

                              <div className="grid sm:grid-cols-3 gap-3">
                                <div className="sm:col-span-2">
                                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                                    Question Prompt *
                                  </label>
                                  <input
                                    type="text"
                                    required
                                    value={newQuestionTitle}
                                    onChange={(e) => setNewQuestionTitle(e.target.value)}
                                    placeholder="e.g. Which terpene profile did you notice most?"
                                    className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-700"
                                  />
                                </div>

                                <div>
                                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                                    Question Type
                                  </label>
                                  <select
                                    value={newQuestionType}
                                    onChange={(e) =>
                                      setNewQuestionType(
                                        e.target.value as 'RADIO' | 'CHECKBOX' | 'TEXT' | 'PARAGRAPH'
                                      )
                                    }
                                    className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-700"
                                  >
                                    <option value="TEXT">Short Text Answer</option>
                                    <option value="PARAGRAPH">Long Paragraph</option>
                                    <option value="RADIO">Multiple Choice (Radio)</option>
                                    <option value="CHECKBOX">Checkboxes (Multi-select)</option>
                                  </select>
                                </div>
                              </div>

                              {(newQuestionType === 'RADIO' || newQuestionType === 'CHECKBOX') && (
                                <div>
                                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                                    Options (Comma-Separated)
                                  </label>
                                  <input
                                    type="text"
                                    value={newQuestionOptions}
                                    onChange={(e) => setNewQuestionOptions(e.target.value)}
                                    placeholder="Option 1, Option 2, Option 3"
                                    className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-700"
                                  />
                                </div>
                              )}

                              <div className="flex items-center justify-between pt-1">
                                <label className="inline-flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={newQuestionRequired}
                                    onChange={(e) => setNewQuestionRequired(e.target.checked)}
                                    className="rounded border-gray-300 text-emerald-700 focus:ring-emerald-600"
                                  />
                                  <span>Required question</span>
                                </label>

                                <button
                                  type="submit"
                                  disabled={isMutating}
                                  className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50"
                                >
                                  Append Question
                                </button>
                              </div>
                            </form>
                          </div>
                        ) : (
                          /* Responses View */
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-semibold text-gray-600">
                                Showing <span className="font-bold text-gray-900">{formResponses.length}</span>{' '}
                                recorded response(s) from Google Forms API
                              </p>
                              <button
                                type="button"
                                onClick={() => loadFormDetailsAndResponses(selectedForm.formId)}
                                className="text-xs font-bold text-emerald-800 hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                <RefreshCw size={12} />
                                <span>Refresh Responses</span>
                              </button>
                            </div>

                            {formResponses.length === 0 ? (
                              <div className="p-8 bg-gray-50 rounded-2xl border border-gray-100 text-center space-y-2">
                                <MessageSquare size={28} className="text-gray-300 mx-auto" />
                                <p className="text-xs font-bold text-gray-700">No Responses Submitted Yet</p>
                                <p className="text-[11px] text-gray-500 max-w-md mx-auto">
                                  Share the live form link with customers or patients. Once they submit the form, their answers will appear here automatically.
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-4">
                                {formResponses.map((resp, idx) => (
                                  <div
                                    key={resp.responseId || idx}
                                    className="p-4 rounded-2xl border border-gray-200 bg-gray-50/60 space-y-3"
                                  >
                                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 pb-2.5">
                                      <div className="flex items-center gap-2">
                                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-bold text-[11px]">
                                          Response #{idx + 1}
                                        </span>
                                        {resp.respondentEmail && (
                                          <span className="text-xs font-semibold text-gray-700">
                                            {resp.respondentEmail}
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-[11px] text-gray-400">
                                        Submitted {new Date(resp.lastSubmittedTime).toLocaleString()}
                                      </span>
                                    </div>

                                    <div className="grid sm:grid-cols-2 gap-3">
                                      {resp.answers &&
                                        (Object.entries(resp.answers) as Array<[string, GoogleFormResponseAnswer]>).map(([qId, ansObj]) => {
                                          const questionLabel =
                                            questionTitleMap[qId] || `Question (${qId})`;
                                          const values =
                                            ansObj.textAnswers?.answers
                                              ?.map((a) => a.value)
                                              .join(', ') || '—';
                                          return (
                                            <div
                                              key={qId}
                                              className="bg-white p-3 rounded-xl border border-gray-100"
                                            >
                                              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                                {questionLabel}
                                              </p>
                                              <p className="text-xs font-semibold text-gray-900 mt-1">
                                                {values}
                                              </p>
                                            </div>
                                          );
                                        })}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: PRE-BUILT DISPENSARY GOOGLE FORM TEMPLATES */}
            {activeWorkspaceTab === 'templates' && (
              <div className="grid md:grid-cols-3 gap-6">
                {DISPENSARY_TEMPLATES.map((tpl) => (
                  <div
                    key={tpl.id}
                    className="bg-white border border-gray-200 rounded-2xl p-6 shadow-2xs flex flex-col justify-between space-y-5 hover:border-emerald-600/50 transition"
                  >
                    <div className="space-y-3">
                      <span className="inline-block text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {tpl.badge}
                      </span>
                      <h3 className="font-heading font-bold text-base text-gray-900">
                        {tpl.title}
                      </h3>
                      <p className="text-xs text-gray-600 leading-relaxed">{tpl.description}</p>

                      <div className="pt-2 space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                          Included Questions ({tpl.questions.length}):
                        </p>
                        <ul className="space-y-1.5 text-xs text-gray-700">
                          {tpl.questions.map((q, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-emerald-700 font-bold">{i + 1}.</span>
                              <span className="line-clamp-2">{q.title}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isMutating}
                      onClick={() =>
                        requestCreateGoogleForm(tpl.title, tpl.formDescription, tpl.questions)
                      }
                      className="w-full py-3 px-4 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <Plus size={15} />
                      <span>Create Form in My Google Account</span>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* TAB 3: CUSTOM GOOGLE FORM BUILDER */}
            {activeWorkspaceTab === 'builder' && (
              <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-2xs max-w-4xl mx-auto space-y-6">
                <div>
                  <h2 className="font-heading font-bold text-lg text-gray-900">
                    Custom Google Form Builder
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Design a custom questionnaire and publish it directly to your Google Forms account.
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                      Form Title *
                    </label>
                    <input
                      type="text"
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-700 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                      Form Description
                    </label>
                    <input
                      type="text"
                      value={customDescription}
                      onChange={(e) => setCustomDescription(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-700 font-semibold"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-gray-800">
                      Form Questions ({draftQuestions.length})
                    </h3>
                    <button
                      type="button"
                      onClick={() =>
                        setDraftQuestions((prev) => [
                          ...prev,
                          {
                            id: `q-${Date.now()}`,
                            title: '',
                            type: 'TEXT',
                            required: false,
                            optionsText: 'Option 1, Option 2',
                          },
                        ])
                      }
                      className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Plus size={14} />
                      <span>Add Question</span>
                    </button>
                  </div>

                  {draftQuestions.map((dq, idx) => (
                    <div
                      key={dq.id}
                      className="p-4 rounded-xl border border-gray-200 bg-gray-50/70 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-900">
                          Question #{idx + 1}
                        </span>
                        {draftQuestions.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setDraftQuestions((prev) => prev.filter((item) => item.id !== dq.id))
                            }
                            className="text-xs text-rose-600 hover:underline font-semibold cursor-pointer"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      <div className="grid sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2">
                          <input
                            type="text"
                            value={dq.title}
                            onChange={(e) =>
                              setDraftQuestions((prev) =>
                                prev.map((item) =>
                                  item.id === dq.id ? { ...item, title: e.target.value } : item
                                )
                              )
                            }
                            placeholder="Enter question title..."
                            className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl"
                          />
                        </div>
                        <div>
                          <select
                            value={dq.type}
                            onChange={(e) =>
                              setDraftQuestions((prev) =>
                                prev.map((item) =>
                                  item.id === dq.id
                                    ? {
                                        ...item,
                                        type: e.target.value as
                                          | 'RADIO'
                                          | 'CHECKBOX'
                                          | 'TEXT'
                                          | 'PARAGRAPH',
                                      }
                                    : item
                                )
                              )
                            }
                            className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl"
                          >
                            <option value="TEXT">Short Answer</option>
                            <option value="PARAGRAPH">Paragraph</option>
                            <option value="RADIO">Multiple Choice</option>
                            <option value="CHECKBOX">Checkboxes</option>
                          </select>
                        </div>
                      </div>

                      {(dq.type === 'RADIO' || dq.type === 'CHECKBOX') && (
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
                            Choices (comma-separated)
                          </label>
                          <input
                            type="text"
                            value={dq.optionsText}
                            onChange={(e) =>
                              setDraftQuestions((prev) =>
                                prev.map((item) =>
                                  item.id === dq.id
                                    ? { ...item, optionsText: e.target.value }
                                    : item
                                )
                              )
                            }
                            className="w-full px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-xl"
                          />
                        </div>
                      )}

                      <label className="inline-flex items-center gap-2 text-xs font-semibold text-gray-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={dq.required}
                          onChange={(e) =>
                            setDraftQuestions((prev) =>
                              prev.map((item) =>
                                item.id === dq.id
                                  ? { ...item, required: e.target.checked }
                                  : item
                              )
                            )
                          }
                        />
                        <span>Required</span>
                      </label>
                    </div>
                  ))}
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    disabled={isMutating}
                    onClick={() =>
                      requestCreateGoogleForm(
                        customTitle,
                        customDescription,
                        draftQuestions.map((dq) => ({
                          title: dq.title,
                          required: dq.required,
                          type: dq.type,
                          options: dq.optionsText
                            .split(',')
                            .map((s) => s.trim())
                            .filter(Boolean),
                        }))
                      )
                    }
                    className="px-6 py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <FileSpreadsheet size={15} />
                    <span>Create Custom Google Form</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mandatory User Confirmation Modal for Mutating / Destructive Operations */}
      {confirmModal && confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4 text-left">
            <div className="flex items-start gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  confirmModal.isDestructive
                    ? 'bg-rose-100 text-rose-700'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {confirmModal.isDestructive ? <Trash2 size={20} /> : <HelpCircle size={20} />}
              </div>
              <div>
                <h3 className="font-heading font-bold text-base text-gray-900">
                  {confirmModal.title}
                </h3>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                  {confirmModal.description}
                </p>
              </div>
            </div>

            {confirmModal.details && confirmModal.details.length > 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 max-h-40 overflow-y-auto space-y-1 text-xs text-gray-700 font-medium">
                {confirmModal.details.map((line, i) => (
                  <p key={i} className="truncate">
                    {line}
                  </p>
                ))}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const action = confirmModal.onConfirm;
                  setConfirmModal(null);
                  await action();
                }}
                className={`px-4 py-2 rounded-xl text-white text-xs font-bold transition cursor-pointer ${
                  confirmModal.isDestructive
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-emerald-800 hover:bg-emerald-900'
                }`}
              >
                {confirmModal.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
