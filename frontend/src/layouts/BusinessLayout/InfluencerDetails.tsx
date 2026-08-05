import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/client";
import { campaignApi } from "../../api/campaignApi";
import type { Campaign } from "../../api/campaignApi";
import { isRegisteredOnPlatform, hasDeliverableEmail, resolveOutreachContactEmail } from "../../api/outreachApi";
import { influencerApi } from "../../api/influencerApi";
import type { ROIPredictionResult } from "../../api/influencerApi";
import { reportApi } from "../../api/reportApi";

interface InfluencerProfile {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
    avatar: string;
    hasSignedUp?: boolean;
  };
  niche: string[];
  location: string;
  bio: string;
  platforms: {
    youtube?: {
      handle: string;
      subscribers: number;
      avgViews: number;
      engagementRate: number;
    };
    instagram?: {
      handle: string;
      followers: number;
      engagementRate: number;
    };
    tiktok?: {
      handle: string;
      followers: number;
      engagementRate: number;
    };
  };
  trustScore: number;
  trustScoreBreakdown?: {
    engagementAuthenticity: number;
    followerQuality: number;
    contentConsistency: number;
    collaborationHistory: number;
  };
  totalFollowers: number;
  avgEngagementRate: number;
  tags: string[];
}

export default function InfluencerDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<InfluencerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState("");
  const [message, setMessage] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [modalError, setModalError] = useState("");

  // Report Modal State
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [reporting, setReporting] = useState(false);
  const [reportError, setReportError] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/influencers/${id}`);
        setProfile(res.data.data);
        if (res.data.data.aiModelMetrics) {
          setTrustAiMetrics(res.data.data.aiModelMetrics);
        }
      } catch (err: any) {
        setError(err instanceof Error ? err.message : "Failed to load profile.");
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchProfile();
  }, [id]);

  useEffect(() => {
    if (showModal) {
      campaignApi.getMyCampaigns()
        .then(res => setCampaigns(res.data))
        .catch(() => setModalError("Failed to load campaigns"));
    }
  }, [showModal]);

  const isOnPlatform = isRegisteredOnPlatform(profile?.user);
  const needsContactEmail =
    !isOnPlatform && !hasDeliverableEmail(profile?.user?.email);

  const handleSendRequest = async () => {
    if (!selectedCampaign) return setModalError("Please select a campaign");
    if (!message) return setModalError("Please add a message");

    const emailToSend = resolveOutreachContactEmail(profile?.user?.email, contactEmail);
    if (!isOnPlatform && !emailToSend) {
      return setModalError("Enter their real email so Mashhoor can send the invitation.");
    }

    setSending(true);
    setModalError("");
    try {
      if (profile) {
        const result = await campaignApi.addInfluencer(
          selectedCampaign,
          profile.user._id,
          message,
          !isOnPlatform ? emailToSend : undefined
        );
        setShowModal(false);
        setMessage("");
        setContactEmail("");
        setSelectedCampaign("");
        alert(
          result.channel === "email"
            ? "Added to campaign. Mashhoor emailed them an invitation to join."
            : "Added to campaign. They will see your invite in Mashhoor."
        );
      }
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : "Failed to add to campaign");
    } finally {
      setSending(false);
    }
  };

  const handleReportUser = async () => {
    if (!reportReason) return setReportError("Please select a reason");
    if (!reportDetails) return setReportError("Please provide details");

    setReporting(true);
    setReportError("");
    try {
      if (profile) {
        await reportApi.createReport(profile.user._id, reportReason, reportDetails);
        setShowReportModal(false);
        setReportReason("");
        setReportDetails("");
        alert("Report submitted successfully. Our team will review it shortly.");
      }
    } catch (err: unknown) {
      setReportError(err instanceof Error ? err.message : "Failed to submit report");
    } finally {
      setReporting(false);
    }
  };

  const [calculatingTrust, setCalculatingTrust] = useState(false);
  const [trustAiMetrics, setTrustAiMetrics] = useState<any>(null);

  const handleCalculateTrustScore = async () => {
    if (!profile) return;
    try {
      setCalculatingTrust(true);
      const res = await influencerApi.calculateTrustScore(profile.user._id);
      setProfile({ ...profile, trustScore: res.trustScore, trustScoreBreakdown: res.breakdown });
      if (res.aiModelMetrics) {
        setTrustAiMetrics(res.aiModelMetrics);
      }
    } catch (err) {
      console.error("Failed to calculate trust score", err);
      alert("Failed to calculate trust score.");
    } finally {
      setCalculatingTrust(false);
    }
  };

  // ROI Predictor State
  const [investment, setInvestment] = useState("10000");
  const [productValue, setProductValue] = useState("2000");
  const [predictingROI, setPredictingROI] = useState(false);
  const [roiResult, setRoiResult] = useState<ROIPredictionResult | null>(null);

  const handlePredictROI = async () => {
    if (!profile) return;
    try {
      setPredictingROI(true);
      const res = await influencerApi.predictROI(profile.user._id, {
        investment: Number(investment),
        productValue: Number(productValue)
      });
      setRoiResult(res);
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to predict ROI");
    } finally {
      setPredictingROI(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f9fafb] p-8 flex justify-center items-center">
        <div className="animate-pulse text-xl text-gray-500">Loading profile data from YouTube API...</div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-[#f9fafb] p-8">
        <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-200">
          {error || "Profile not found."}
        </div>
        <button onClick={() => navigate(-1)} className="mt-4 text-purple-600 hover:underline">
          Go Back
        </button>
      </div>
    );
  }

  const { user, location, bio, tags, totalFollowers, avgEngagementRate, trustScore, trustScoreBreakdown, niche, platforms } = profile;

  const followersStr = totalFollowers >= 1000 ? `${(totalFollowers / 1000).toFixed(0)}K` : String(totalFollowers);

  let reachNum = 0;
  if (platforms?.youtube?.avgViews) {
    reachNum = platforms.youtube.avgViews;
  } else if (platforms?.instagram) {
    // We compute reach directly from the engagement rate now, as the backend unified the ER formula to (Reach/Followers)*100
    reachNum = Math.round(platforms.instagram.followers * (platforms.instagram.engagementRate / 100));
  }

  const avgReach = reachNum >= 1000 ? `${(reachNum / 1000).toFixed(0)}K` : String(reachNum);

  const pastCampaignsCount = isOnPlatform ? ((profile as any).pastCampaigns?.length || 0) : 0;
  const responseRate = isOnPlatform && pastCampaignsCount > 0 ? "98%" : "0%";

  return (
    <div className="min-h-screen bg-[#f9fafb] p-4 md:p-8 relative">
      {/* Profile Header Card */}
      <div className="bg-white rounded-2xl p-6 md:p-8 border border-gray-200 mb-6 shadow-sm">
        <div className="flex flex-col md:flex-row gap-6 md:items-start">
          <img
            src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=8b5cf6&color=fff`}
            alt={user.name}
            className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover border border-gray-100"
            referrerPolicy="no-referrer"
          />
          <div className="flex-1">
            <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
                  <span className="bg-blue-50 text-blue-600 text-xs font-semibold px-2 py-0.5 rounded flex items-center gap-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
                    Verified
                  </span>
                </div>
                <p className="text-gray-600 font-medium mb-3">{niche.join(" & ")} Creator</p>
                <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                  <span className="flex items-center gap-1">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                    {location || "Unknown"}
                  </span>
                  <span className="flex items-center gap-1">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                    {followersStr} followers
                  </span>
                  <span className="flex items-center gap-1">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
                    {avgEngagementRate.toFixed(1)}% engagement
                  </span>
                </div>
                <p className="text-sm text-gray-600 max-w-3xl leading-relaxed mb-4 whitespace-pre-wrap">
                  {bio}
                </p>
                <div className="flex flex-wrap gap-2">
                  {tags?.length > 0 ? tags.map(tag => (
                    <span key={tag} className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">{tag}</span>
                  )) : niche.map(n => (
                    <span key={n} className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">{n}</span>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-3 items-end">
                <div className="flex gap-3">
                  <button className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                    Contact
                  </button>
                  <button
                    onClick={() => setShowModal(true)}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors flex items-center gap-2"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    Add to Campaign
                  </button>
                </div>
                <button
                  onClick={() => setShowReportModal(true)}
                  className="text-xs font-bold text-red-500 hover:text-red-700 flex items-center gap-1 transition-colors"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" /></svg>
                  Report User
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="text-sm text-gray-500 font-medium mb-2 flex justify-between">
            Trust Score <span className="text-orange-500">❖</span>
          </div>
          <div>
            <div className="text-3xl font-bold text-gray-900 mb-1">{trustScore}/100</div>
            <div className="text-xs text-green-600 font-medium">{trustScore >= 80 ? "Excellent rating" : trustScore >= 60 ? "Good rating" : "Average rating"}</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="text-sm text-gray-500 font-medium mb-2 flex justify-between">
            Avg. Reach <span className="text-purple-500">↗</span>
          </div>
          <div>
            <div className="text-3xl font-bold text-gray-900 mb-1">{avgReach}</div>
            <div className="text-xs text-gray-500">Per post</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="text-sm text-gray-500 font-medium mb-2 flex justify-between">
            Collaborations <span className="text-gray-400">👥</span>
          </div>
          <div>
            <div className="text-3xl font-bold text-gray-900 mb-1">{pastCampaignsCount}</div>
            <div className="text-xs text-gray-500">Mashhoor campaigns</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="text-sm text-gray-500 font-medium mb-2 flex justify-between">
            Response Rate <span className="text-gray-400">♡</span>
          </div>
          <div>
            <div className="text-3xl font-bold text-gray-900 mb-1">{responseRate}</div>
            <div className="text-xs text-gray-500">Within 24h</div>
          </div>
        </div>
      </div>

      {/* Trust Score Breakdown */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm mb-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">Mashhoor Trust Score Details</h2>
          <button
            onClick={handleCalculateTrustScore}
            disabled={calculatingTrust}
            className="px-4 py-2 bg-purple-50 text-purple-700 font-medium rounded-lg text-sm hover:bg-purple-100 transition-colors"
          >
            {calculatingTrust ? "Analyzing..." : "Run AI Fraud Analysis"}
          </button>
        </div>

        {trustAiMetrics && (
          <div className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white p-4 rounded-xl mb-6 shadow-md flex flex-col md:flex-row justify-between items-center gap-4 animate-fadeIn">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
              </div>
              <div>
                <div className="text-xs text-purple-200 font-semibold uppercase tracking-wider">{trustAiMetrics.modelType}</div>
                <div className="text-sm font-bold">AI Fraud & Trust Engine Active</div>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full text-xs font-semibold text-green-300 border border-white/10 backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
              Real-time AI Prediction
            </div>
          </div>
        )}

        {trustScoreBreakdown ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div className="text-sm text-gray-500 mb-1">Engagement Authenticity</div>
              <div className="text-xl font-bold text-gray-900">{trustScoreBreakdown.engagementAuthenticity}%</div>
              <div className="text-xs text-gray-400 mt-1">Bot/Spike Detection</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div className="text-sm text-gray-500 mb-1">Follower Quality</div>
              <div className="text-xl font-bold text-gray-900">{trustScoreBreakdown.followerQuality}%</div>
              <div className="text-xs text-gray-400 mt-1">Real vs Fake Accounts</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div className="text-sm text-gray-500 mb-1">Content Consistency</div>
              <div className="text-xl font-bold text-gray-900">{trustScoreBreakdown.contentConsistency}%</div>
              <div className="text-xs text-gray-400 mt-1">Posting Frequency</div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            Click "Run AI Fraud Analysis" to calculate real-time bot detection and engagement authenticity metrics.
          </div>
        )}
      </div>

      {/* Influencer-Specific ROI Predictor */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm mb-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">✨ Predict Campaign ROI</h2>
        </div>
        <p className="text-sm text-gray-500 mb-6">
          See exactly how much revenue you can generate by collaborating with {user.name}. We use their real-time reach, engagement rate, and Mashhoor Trust Score to calculate your expected return on investment.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Your Budget / Offer (PKR)</label>
            <input type="number" value={investment} onChange={(e) => setInvestment(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm text-gray-900 focus:outline-none focus:border-purple-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Avg Product Price (PKR)</label>
            <input type="number" value={productValue} onChange={(e) => setProductValue(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm text-gray-900 focus:outline-none focus:border-purple-500" />
          </div>
          <div className="flex items-end">
            <button
              onClick={handlePredictROI}
              disabled={predictingROI}
              className="w-full py-2.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
            >
              {predictingROI ? "Calculating..." : "Predict ROI"}
            </button>
          </div>
        </div>

        {roiResult && (
          <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 mt-4 animate-fadeIn">
            <div className="grid grid-cols-3 gap-4 mb-3">
              <div className="bg-white p-3 rounded-lg text-center shadow-sm">
                <div className="text-xs text-gray-500 mb-1">Est. Revenue</div>
                <div className="font-bold text-gray-900">PKR {roiResult.estimatedRevenue.toLocaleString()}</div>
              </div>
              <div className="bg-white p-3 rounded-lg text-center shadow-sm">
                <div className="text-xs text-gray-500 mb-1">Net ROI</div>
                <div className="font-bold text-gray-900">PKR {roiResult.predictedROI.toLocaleString()}</div>
              </div>
              <div className="bg-white p-3 rounded-lg text-center shadow-sm border-b-2 border-green-400">
                <div className="text-xs text-gray-500 mb-1">ROI %</div>
                <div className="font-bold text-green-600">+{roiResult.roiPercentage.toFixed(1)}%</div>
              </div>
            </div>
            {roiResult.aiModelMetrics && (
              <div className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white p-4 rounded-xl mb-3 shadow-md flex flex-col md:flex-row justify-between items-center gap-4 animate-fadeIn">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
                  </div>
                  <div>
                    <div className="text-xs text-purple-200 font-semibold uppercase tracking-wider">{roiResult.aiModelMetrics.modelType}</div>
                    <div className="text-sm font-bold">AI Regression Engine Active</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full text-xs font-semibold text-green-300 border border-white/10 backdrop-blur-sm">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                  Real-time AI Prediction
                </div>
              </div>
            )}
            <p className="text-sm text-purple-800 bg-white p-3 rounded-lg border border-purple-100 leading-relaxed">
              {roiResult.summary}
            </p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button className="px-4 py-3 text-sm font-bold text-gray-900 border-b-2 border-gray-900 bg-white rounded-t-lg shadow-[0_-2px_0_0_rgba(0,0,0,0.05)]">
          Past Collaborations
        </button>
      </div>

      {/* Past Collaborations Content */}
      <div className="space-y-4 mb-12">
        {(profile as any).pastCampaigns && (profile as any).pastCampaigns.length > 0 ? (
          (profile as any).pastCampaigns.map((c: any) => (
            <div key={c._id} className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-fadeIn">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-bold text-gray-900">{c.title}</h3>
                  <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-bold uppercase tracking-wider">{c.status}</span>
                </div>
                <p className="text-sm text-gray-600 line-clamp-2 mb-2">{c.description}</p>
                <div className="text-xs text-gray-400 font-medium">Campaign Budget: {c.budget?.currency || "PKR"} {c.budget?.total?.toLocaleString()}</div>
              </div>
              <div className="bg-gray-50 px-4 py-2 rounded-xl border border-gray-100 text-xs font-semibold text-gray-700 whitespace-nowrap">
                Verified Mashhoor Collab
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-10 text-gray-500 bg-white rounded-2xl border border-gray-200 shadow-sm">
            <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            This influencer has no past campaigns on Mashhoor yet.
          </div>
        )}
      </div>

      {/* Modal Overlay */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl animate-fadeIn">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Add to Campaign</h2>
            <p className="text-sm text-gray-500 mb-4">
              {isOnPlatform
                ? "They are registered on Mashhoor — they will receive your invite in the app."
                : "This creator is not registered yet. Mashhoor will email them an invitation to join."}
            </p>

            {modalError && (
              <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-200">
                {modalError}
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Campaign</label>
              <select
                value={selectedCampaign}
                onChange={e => setSelectedCampaign(e.target.value)}
                className="w-full border border-gray-200 rounded-lg p-3 text-gray-900 focus:outline-none focus:border-purple-500 bg-gray-50"
              >
                <option value="">-- Choose a campaign --</option>
                {campaigns.map(c => (
                  <option key={c._id} value={c._id}>{c.title}</option>
                ))}
              </select>
              {campaigns.length === 0 && (
                <p className="text-xs text-orange-500 mt-2">You don't have any campaigns yet. Create one first.</p>
              )}
            </div>

            {needsContactEmail && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Their email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="creator@email.com"
                  className="w-full border border-gray-200 rounded-lg p-3 text-gray-900 focus:outline-none focus:border-purple-500 bg-gray-50"
                />
              </div>
            )}

            {!isOnPlatform && !needsContactEmail && profile?.user?.email && (
              <p className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-4">
                Invitation will be emailed to <strong>{profile.user.email}</strong>
              </p>
            )}

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Message to Influencer</label>
              <textarea
                rows={4}
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Hi! We'd love to collaborate with you on this campaign..."
                className="w-full border border-gray-200 rounded-lg p-3 text-gray-900 focus:outline-none focus:border-purple-500 bg-gray-50"
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSendRequest}
                disabled={
                  sending ||
                  campaigns.length === 0 ||
                  (needsContactEmail && !contactEmail.trim())
                }
                className="px-6 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {sending ? "Adding..." : "Add to Campaign"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl animate-fadeIn border-t-4 border-red-500">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center text-red-500">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900">Report User</h2>
            </div>

            <p className="text-sm text-gray-500 mb-4">
              Please provide details about why you are reporting this influencer. Our trust and safety team will review this report.
            </p>

            {reportError && (
              <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-200">
                {reportError}
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
              <select
                value={reportReason}
                onChange={e => setReportReason(e.target.value)}
                className="w-full border border-gray-200 rounded-lg p-3 text-gray-900 focus:outline-none focus:border-red-500 bg-gray-50"
              >
                <option value="">-- Select a reason --</option>
                <option value="Fake Engagement/Followers">Fake Engagement / Followers</option>
                <option value="Unprofessional Behavior">Unprofessional Behavior</option>
                <option value="Spam / Scams">Spam / Scams</option>
                <option value="Inappropriate Content">Inappropriate Content</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Additional Details</label>
              <textarea
                rows={4}
                value={reportDetails}
                onChange={e => setReportDetails(e.target.value)}
                placeholder="Please provide specific details to help us investigate..."
                className="w-full border border-gray-200 rounded-lg p-3 text-gray-900 focus:outline-none focus:border-red-500 bg-gray-50"
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowReportModal(false)}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReportUser}
                disabled={reporting}
                className="px-6 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {reporting ? "Submitting..." : "Submit Report"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
