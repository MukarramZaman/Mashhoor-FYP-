import { Outlet, Link, useLocation } from "react-router-dom";
import { Title } from "../../components";

function AdminLayout() {
  const location = useLocation();

  return (
    <div className="bg-[#f9fafb] min-h-screen">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Title />
          </div>

          <div className="flex items-center gap-8">
            <Link 
              to="/admin/dashboard" 
              className={`text-sm font-bold transition-colors ${
                location.pathname === '/admin/dashboard' ? 'text-purple-600' : 'text-gray-400 hover:text-gray-900'
              }`}
            >
              Dashboard
            </Link>
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 border border-white shadow-sm overflow-hidden">
               <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop" alt="Admin" />
            </div>
          </div>
        </div>
      </nav>

      {/* Page Content */}
      <main>
        <Outlet />
      </main>
    </div>
  );
}

export default AdminLayout;
