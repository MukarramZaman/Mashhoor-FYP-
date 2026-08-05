import { useEffect, useState } from "react";
import { reportApi, type Report, type ReportStatus } from "../../api/reportApi";

function ReportedUsers() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchReports = async () => {
    try {
      const data = await reportApi.getReports();
      setReports(data);
      setError("");
    } catch (err: any) {
      setError(err.message || "Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleUpdateStatus = async (id: string, status: ReportStatus) => {
    try {
      await reportApi.updateStatus(id, status);
      fetchReports();
    } catch (err) {
      alert("Failed to update status");
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading reports...</div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-10 flex items-center gap-4">
        <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 shadow-sm border border-red-100">
           <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        </div>
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-1">Reported Users</h1>
          <p className="text-gray-500 text-lg">Review and take action on reported violations</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {reports.length === 0 ? (
        <div className="text-gray-400 py-16 text-center border border-dashed border-gray-200 rounded-2xl bg-white">
          No reported users found.
        </div>
      ) : (
        <div className="space-y-8">
          {reports.map((report) => (
            <div key={report._id} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex">
              {/* Left Priority Accent */}
              <div className={`w-1.5 ${report.priority === 'high' ? 'bg-red-500' : report.priority === 'medium' ? 'bg-yellow-400' : 'bg-blue-400'}`}></div>
              
              <div className="p-8 flex-1">
                 <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-5">
                      <img src={report.reportedUser?.avatar || "https://via.placeholder.com/100"} alt={report.reportedUser?.name || "Deleted User"} className="w-16 h-16 rounded-2xl object-cover shadow-sm" />
                      <div>
                         <div className="flex items-center gap-3 mb-1">
                            <h3 className="text-xl font-bold text-gray-900">{report.reportedUser?.name || "Deleted User"}</h3>
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                              report.priority === 'high' ? 'bg-red-50 text-red-500' : report.priority === 'medium' ? 'bg-yellow-50 text-yellow-600' : 'bg-blue-50 text-blue-600'
                            }`}>
                              {report.priority} priority
                            </span>
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                              report.status === 'pending' ? 'bg-gray-100 text-gray-600' : report.status === 'reviewed' ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-400'
                            }`}>
                              {report.status}
                            </span>
                         </div>
                         <div className="text-gray-400 text-sm font-medium">
                            Reported by <span className="text-gray-900">{report.reportedBy?.name || "System"}</span> • {new Date(report.createdAt).toLocaleDateString()}
                         </div>
                      </div>
                    </div>
                 </div>

                 <div className="bg-red-50/50 rounded-2xl p-6 mb-8 border border-red-50">
                    <h4 className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-3">Reason: {report.reason}</h4>
                    <p className="text-gray-700 font-medium leading-relaxed">{report.details}</p>
                 </div>

                 {report.status === "pending" && (
                   <div className="flex items-center gap-4">
                      <button 
                        onClick={() => handleUpdateStatus(report._id, "reviewed")}
                        className="px-6 py-3 border border-yellow-200 text-yellow-600 rounded-xl font-bold hover:bg-yellow-50 transition-all flex items-center gap-2">
                         <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                         Mark Reviewed (Issue Warning)
                      </button>
                      <button 
                        onClick={() => handleUpdateStatus(report._id, "dismissed")}
                        className="px-6 py-3 border border-gray-200 text-gray-500 rounded-xl font-bold hover:bg-gray-50 transition-all flex items-center gap-2">
                         <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                         Dismiss Report
                      </button>
                   </div>
                 )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ReportedUsers;
