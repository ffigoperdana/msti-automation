import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

// Interface untuk data contact point
interface ContactPoint {
  name: string;
  type: 'email' | 'slack' | 'webhook' | 'telegram';
  isDefault: boolean;
  settings: {
    // Email settings
    email?: {
      addresses: string[];
      message: string;
    };
    // Slack settings
    slack?: {
      webhookUrl?: string;
      channel?: string;
      message?: string;
    };
    // Webhook settings
    webhook?: {
      url?: string;
      username?: string;
      password?: string;
    };
    // Telegram settings
    telegram?: {
      botToken?: string;
      chatId?: string;
      message?: string;
    };
  };
  disableResolveMessage: boolean;
}

// Icon dan label untuk tipe kontak
const CONTACT_TYPE_INFO = {
  email: { label: 'Email', icon: '✉️' },
  slack: { label: 'Slack', icon: '💬' },
  webhook: { label: 'Webhook', icon: '🔗' },
  telegram: { label: 'Telegram', icon: '📱' }
};

const ContactPointForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;

  const [formData, setFormData] = useState<ContactPoint>({
    name: "",
    type: "email",
    isDefault: false,
    settings: {
      email: {
        addresses: [""],
        message: "Notifikasi alert dari MSTI Automation",
      },
    },
    disableResolveMessage: false
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [testStatus, setTestStatus] = useState<'none' | 'success' | 'error'>('none');
  const [testMessage, setTestMessage] = useState('');
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    if (isEditing) {
      // Simulasi pengambilan data contact point berdasarkan ID
      setIsLoading(true);
      setTimeout(() => {
        const mockData: ContactPoint = {
          name: "Email Tim IT",
          type: "email",
          isDefault: true,
          settings: {
            email: {
              addresses: ["it-support@example.com", "monitoring@example.com"],
              message: "Notifikasi alert dari MSTI Automation",
            },
          },
          disableResolveMessage: false
        };
        setFormData(mockData);
        setIsLoading(false);
      }, 500);
    }
  }, [isEditing, id]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const type = e.target.value as 'email' | 'slack' | 'webhook' | 'telegram';
    
    // Reset settings saat tipe berubah
    const newSettings: ContactPoint["settings"] = {};
    
    switch (type) {
      case "email":
        newSettings.email = {
          addresses: [""],
          message: "Notifikasi alert dari MSTI Automation",
        };
        break;
      case "slack":
        newSettings.slack = {
          webhookUrl: "",
          channel: "",
          message: "Notifikasi alert dari MSTI Automation",
        };
        break;
      case "webhook":
        newSettings.webhook = {
          url: "",
          username: "",
          password: "",
        };
        break;
      case "telegram":
        newSettings.telegram = {
          botToken: "",
          chatId: "",
          message: "Notifikasi alert dari MSTI Automation",
        };
        break;
      default:
        break;
    }

    setFormData((prev) => ({
      ...prev,
      type,
      settings: newSettings,
    }));
  };

  const handleToggleDefault = () => {
    setFormData((prev) => ({
      ...prev,
      isDefault: !prev.isDefault,
    }));
  };

  const handleEmailAddressChange = (index: number, value: string) => {
    setFormData((prev) => {
      const newAddresses = [...(prev.settings.email?.addresses || [])];
      newAddresses[index] = value;
      
      return {
        ...prev,
        settings: {
          ...prev.settings,
          email: {
            ...(prev.settings.email || { message: "" }),
            addresses: newAddresses,
          },
        },
      };
    });
  };

  const addEmailAddress = () => {
    setFormData((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        email: {
          ...(prev.settings.email || { message: "" }),
          addresses: [...(prev.settings.email?.addresses || []), ""],
        },
      },
    }));
  };

  const removeEmailAddress = (index: number) => {
    setFormData((prev) => {
      const newAddresses = [...(prev.settings.email?.addresses || [])];
      newAddresses.splice(index, 1);
      
      return {
        ...prev,
        settings: {
          ...prev.settings,
          email: {
            ...(prev.settings.email || { message: "" }),
            addresses: newAddresses,
          },
        },
      };
    });
  };

  const handleSettingChange = (
    type: string,
    field: string,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        [type]: {
          ...(prev.settings[type as keyof typeof prev.settings] as any),
          [field]: value,
        },
      },
    }));
  };

  // Handler untuk test kontak
  const handleTestContact = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsTesting(true);
    setTestStatus('none');
    setTestMessage('');

    // Simulasi API call
    setTimeout(() => {
      // Validasi form terlebih dahulu
      if (!validateForm()) {
        setTestStatus('error');
        setTestMessage('Form tidak valid. Harap periksa kembali semua field yang diperlukan.');
        setIsTesting(false);
        return;
      }

      // Simulasi random success/error
      const success = Math.random() > 0.3;
      setTestStatus(success ? 'success' : 'error');
      setTestMessage(success 
        ? `Notifikasi test berhasil dikirim ke contact point ${formData.type}` 
        : `Gagal mengirim notifikasi test. Periksa konfigurasi ${formData.type} Anda`
      );
      
      setIsTesting(false);
    }, 1500);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Nama contact point tidak boleh kosong";
    }

    if (formData.type === "email") {
      const addresses = formData.settings.email?.addresses || [];
      if (addresses.length === 0) {
        newErrors.emailAddresses = "Minimal satu alamat email diperlukan";
      } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const invalidEmails = addresses.filter(
          (email) => !emailRegex.test(email)
        );
        if (invalidEmails.length > 0) {
          newErrors.emailAddresses = "Ada alamat email yang tidak valid";
        }
      }
    } else if (formData.type === "slack") {
      if (!formData.settings.slack?.webhookUrl) {
        newErrors.slackWebhookUrl = "Webhook URL tidak boleh kosong";
      }
      if (!formData.settings.slack?.channel) {
        newErrors.slackChannel = "Channel tidak boleh kosong";
      }
    } else if (formData.type === "webhook") {
      if (!formData.settings.webhook?.url) {
        newErrors.webhookUrl = "URL tidak boleh kosong";
      }
    } else if (formData.type === "telegram") {
      if (!formData.settings.telegram?.botToken) {
        newErrors.telegramBotToken = "Bot Token tidak boleh kosong";
      }
      if (!formData.settings.telegram?.chatId) {
        newErrors.telegramChatId = "Chat ID tidak boleh kosong";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      // Tampilkan toast error
      alert("Form tidak valid. Harap periksa kembali form dan perbaiki error yang ada");
      return;
    }

    setIsLoading(true);

    // Simulasi API call
    setTimeout(() => {
      // Tampilkan toast success
      alert(isEditing
        ? "Contact point berhasil diperbarui"
        : "Contact point berhasil dibuat");
      setIsLoading(false);
      navigate("/alerting/contacts");
    }, 1000);
  };

  const renderSettingsForm = () => {
    switch (formData.type) {
      case "email":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Alamat Email
              </label>
              {formData.settings.email?.addresses.map((address, index) => (
                <div key={index} className="flex mb-2 gap-2">
                  <input
                    value={address}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      handleEmailAddressChange(index, e.target.value)
                    }
                    placeholder="Masukkan alamat email"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {index > 0 && (
                    <button
                      type="button"
                      onClick={() => removeEmailAddress(index)}
                      className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      Hapus
                    </button>
                  )}
                </div>
              ))}
              <button 
                type="button"
                onClick={addEmailAddress} 
                className="mt-1 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 focus:outline-none"
              >
                + Tambah Email
              </button>
              {errors.emailAddresses && (
                <p className="mt-1 text-sm text-red-600">{errors.emailAddresses}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pesan
              </label>
              <input
                value={formData.settings.email?.message || ""}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleSettingChange("email", "message", e.target.value)
                }
                placeholder="Pesan notifikasi"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        );

      case "slack":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Webhook URL
              </label>
              <input
                value={formData.settings.slack?.webhookUrl || ""}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleSettingChange("slack", "webhookUrl", e.target.value)
                }
                placeholder="https://hooks.slack.com/services/xxx/yyy/zzz"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {errors.slackWebhookUrl && (
                <p className="mt-1 text-sm text-red-600">{errors.slackWebhookUrl}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Channel
              </label>
              <input
                value={formData.settings.slack?.channel || ""}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleSettingChange("slack", "channel", e.target.value)
                }
                placeholder="#alerts"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {errors.slackChannel && (
                <p className="mt-1 text-sm text-red-600">{errors.slackChannel}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pesan
              </label>
              <input
                value={formData.settings.slack?.message || ""}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleSettingChange("slack", "message", e.target.value)
                }
                placeholder="Pesan notifikasi"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        );

      case "webhook":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                URL
              </label>
              <input
                value={formData.settings.webhook?.url || ""}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleSettingChange("webhook", "url", e.target.value)
                }
                placeholder="https://example.com/webhook"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {errors.webhookUrl && (
                <p className="mt-1 text-sm text-red-600">{errors.webhookUrl}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username (opsional)
              </label>
              <input
                value={formData.settings.webhook?.username || ""}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleSettingChange("webhook", "username", e.target.value)
                }
                placeholder="Username untuk autentikasi"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password (opsional)
              </label>
              <input
                type="password"
                value={formData.settings.webhook?.password || ""}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleSettingChange("webhook", "password", e.target.value)
                }
                placeholder="Password untuk autentikasi"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        );

      case "telegram":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bot Token
              </label>
              <input
                value={formData.settings.telegram?.botToken || ""}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleSettingChange("telegram", "botToken", e.target.value)
                }
                placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {errors.telegramBotToken && (
                <p className="mt-1 text-sm text-red-600">{errors.telegramBotToken}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Chat ID
              </label>
              <input
                value={formData.settings.telegram?.chatId || ""}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleSettingChange("telegram", "chatId", e.target.value)
                }
                placeholder="-100123456789"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {errors.telegramChatId && (
                <p className="mt-1 text-sm text-red-600">{errors.telegramChatId}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pesan
              </label>
              <input
                value={formData.settings.telegram?.message || ""}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleSettingChange("telegram", "message", e.target.value)
                }
                placeholder="Pesan notifikasi"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-800">
          {isEditing ? "Edit Contact Point" : "Buat Contact Point Baru"}
        </h1>
        <p className="text-gray-600 mt-1">
          Konfigurasi titik kontak untuk pengiriman notifikasi alert
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-sm space-y-6">
        {/* Basic Info */}
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-gray-800 border-b pb-2">Informasi Dasar</h2>
          
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Nama <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Misalnya: Email Tim IT, Slack Channel Alerts"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
              Tipe
            </label>
            <select
              id="type"
              name="type"
              value={formData.type}
              onChange={handleTypeChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="email">Email</option>
              <option value="slack">Slack</option>
              <option value="webhook">Webhook</option>
              <option value="telegram">Telegram</option>
            </select>
          </div>

          <div>
            <label htmlFor="isDefault" className="flex items-center">
              <input
                id="isDefault"
                name="isDefault"
                type="checkbox"
                checked={formData.isDefault}
                onChange={handleToggleDefault}
                className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
              />
              <span className="ml-2 text-sm text-gray-700">Jadikan sebagai default contact point</span>
            </label>
          </div>
        </div>

        {/* Contact Settings */}
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-gray-800 border-b pb-2">
            Pengaturan {CONTACT_TYPE_INFO[formData.type].label}
          </h2>
          {renderSettingsForm()}
        </div>

        {/* Test Status */}
        {testStatus !== 'none' && (
          <div className={`p-4 rounded-md ${
            testStatus === 'success' 
              ? 'bg-green-50 text-green-700 border border-green-200' 
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            <div className="flex">
              <div className="flex-shrink-0">
                {testStatus === 'success' ? (
                  <svg className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium">
                  {testStatus === 'success' ? 'Test berhasil' : 'Test gagal'}
                </h3>
                <div className="mt-2 text-sm">
                  <p>{testMessage}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <button
            type="button"
            onClick={() => navigate("/alerting/contacts")}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleTestContact}
            disabled={isTesting}
            className="px-4 py-2 border border-blue-300 rounded-md text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center"
          >
            {isTesting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-700" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Menguji...
              </>
            ) : (
              'Uji Kontak'
            )}
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Menyimpan...
              </>
            ) : (
              isEditing ? "Perbarui" : "Simpan"
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ContactPointForm; 