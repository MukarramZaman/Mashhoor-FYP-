import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { campaignApi } from "../../api/campaignApi";

function CreateCampaign() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Step 1
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // Step 2
  const [niche, setNiche] = useState("");
  const [region, setRegion] = useState("");
  const [size, setSize] = useState(""); // mapping: Micro=10000, Mid=50000, Macro=500000, Mega=1000000

  // Step 3
  const [budget, setBudget] = useState("");
  const [goals, setGoals] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const handleNext = () => {
    if (step === 1 && (!title || !description)) {
      setError("Please fill out all required fields.");
      return;
    }
    if (step === 2 && (!niche || !region)) {
      setError("Please select target niche and region.");
      return;
    }
    setError("");
    setStep(step + 1);
  };

  const handleCreate = async () => {
    if (!budget || !goals || !startDate || !endDate) {
      setError("Please fill out all required fields.");
      return;
    }

    const parseDateString = (dateStr: string) => {
      const [year, month, day] = dateStr.split("-").map(Number);
      return new Date(year, month - 1, day);
    };

    const start = parseDateString(startDate);
    const end = parseDateString(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (start < today) {
      setError("Start date must be today or in the future.");
      return;
    }

    if (start.getTime() === end.getTime()) {
      setError("End date cannot be the same as the start date.");
      return;
    }

    if (end < start) {
      setError("End date must be after the start date.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      let minFollowers = 0;
      if (size === "Micro") minFollowers = 10000;
      if (size === "Mid-tier") minFollowers = 50000;
      if (size === "Macro") minFollowers = 500000;
      if (size === "Mega") minFollowers = 1000000;

      await campaignApi.create({
        title,
        description,
        niche: [niche],
        targetLocations: [region],
        budget: { total: Number(budget), currency: "PKR" },
        requirements: {
          minFollowers,
        },
        timeline: { startDate, endDate },
        goals,
      });

      // Redirect to dashboard on success
      navigate("/business-dashboard", { replace: true });
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to create campaign. Please try again.");
      setIsSubmitting(false);
    }
  };

  const renderStepper = () => (
    <div className="stepper-container">
      <div className={`step-circle ${step >= 1 ? "active" : ""}`}>
        {step > 1 ? (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        ) : (
          "1"
        )}
      </div>

      <div className={`step-line ${step >= 2 ? "active" : ""}`}></div>

      <div className={`step-circle ${step >= 2 ? "active" : ""}`}>
        {step > 2 ? (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        ) : (
          "2"
        )}
      </div>

      <div className={`step-line ${step >= 3 ? "active" : ""}`}></div>

      <div className={`step-circle ${step >= 3 ? "active" : ""}`}>3</div>
    </div>
  );

  return (
    <div className="bg-[#f9fafb] min-h-screen">
      <div className="p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Create New Campaign
          </h1>
          <p className="text-gray-500">
            Follow the steps to set up your influencer marketing campaign
          </p>
        </div>

        {renderStepper()}

        <div className="campaign-card max-w-3xl mx-auto bg-white p-8 rounded-2xl border border-gray-200 shadow-sm mt-8">
          {error && (
            <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-xl border border-red-200 font-medium text-sm">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="animate-fadeIn">
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                Basic Information
              </h2>
              <p className="text-sm text-gray-500 mb-6">Tell us about your campaign</p>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Campaign Name *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Summer Product Launch 2025"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-gray-900 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="mb-8">
                <label className="block text-sm font-medium text-gray-700 mb-2">Campaign Description *</label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your campaign goals, products, and what you're looking for..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-gray-900 focus:outline-none focus:border-purple-500"
                ></textarea>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="animate-fadeIn">
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                Target Audience
              </h2>
              <p className="text-sm text-gray-500 mb-6">Define your target audience</p>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Target Niche *</label>
                <select
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-gray-900 appearance-none focus:outline-none focus:border-purple-500"
                >
                  <option value="">Select target niche</option>
                  <option value="Politics">Politics</option>
                  <option value="Entertainment">Entertainment</option>
                  <option value="Gaming">Gaming</option>
                  <option value="Cricket">Cricket</option>
                  <option value="Fashion">Fashion</option>
                  <option value="Tech">Tech</option>
                </select>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Target Region *</label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-gray-900 appearance-none focus:outline-none focus:border-purple-500"
                >
                  <option value="">Select target region</option>
                  <option value="Pakistan">Pakistan</option>
                </select>
              </div>

              <div className="mb-8">
                <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Influencer Size</label>
                <div className="grid grid-cols-2 gap-4">
                  {['Micro', 'Mid-tier', 'Macro', 'Mega'].map(option => (
                    <div
                      key={option}
                      onClick={() => setSize(option)}
                      className={`cursor-pointer p-3 border rounded-lg text-center font-medium transition-colors ${size === option ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                    >
                      {option}
                      <div className="text-xs font-normal mt-1 opacity-70">
                        {option === 'Micro' && '(10K-50K)'}
                        {option === 'Mid-tier' && '(50K-500K)'}
                        {option === 'Macro' && '(500K-1M)'}
                        {option === 'Mega' && '(1M+)'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="animate-fadeIn">
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                Budget & Timeline
              </h2>
              <p className="text-sm text-gray-500 mb-6">Set your budget, schedule, and goals</p>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Campaign Budget (PKR) *</label>
                <input
                  type="number"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="e.g., 50000"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-gray-900 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date *</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-gray-900 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date *</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-gray-900 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Campaign Objectives *</label>
                <input
                  type="text"
                  value={goals}
                  onChange={(e) => setGoals(e.target.value)}
                  placeholder="What do you want to achieve? (e.g., Brand awareness)"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-gray-900 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
          )}

          <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-100">
            <button
              onClick={() => { setError(""); setStep(step - 1); }}
              disabled={step === 1 || isSubmitting}
              className={`px-6 py-2.5 rounded-lg border border-gray-200 font-medium flex items-center gap-2 transition-colors ${step === 1
                ? "opacity-50 cursor-not-allowed bg-gray-50 text-gray-400"
                : "hover:bg-gray-50 text-gray-700"
                }`}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
              Back
            </button>

            <button
              onClick={step < 3 ? handleNext : handleCreate}
              disabled={isSubmitting}
              className="bg-[#8b5cf6] hover:bg-purple-700 disabled:opacity-70 text-white px-8 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors"
            >
              {isSubmitting ? "Creating..." : step === 3 ? "Create Campaign" : "Next"}
              {!isSubmitting && step < 3 && (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CreateCampaign;
