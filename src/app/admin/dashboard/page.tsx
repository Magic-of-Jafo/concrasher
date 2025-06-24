import AdminGuard from '@/components/auth/AdminGuard';

export default function AdminDashboardPage() {
  return (
    <AdminGuard>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-4">Admin Dashboard</h1>
        <p className="mb-4">Welcome to the Admin Dashboard. This area is restricted to administrators only.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-2">Conventions</h2>
            <p className="text-gray-600">Manage convention listings and details</p>
            <a href="/admin/conventions" className="text-blue-600 hover:underline mt-2 inline-block">
              View Conventions →
            </a>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-2">Role Applications</h2>
            <p className="text-gray-600">Review and manage role applications</p>
            <a href="/admin/applications" className="text-blue-600 hover:underline mt-2 inline-block">
              View Applications →
            </a>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-2">Users</h2>
            <p className="text-gray-600">Manage user accounts and roles</p>
            <a href="/admin/users" className="text-blue-600 hover:underline mt-2 inline-block">
              View Users →
            </a>
          </div>
        </div>
      </div>
    </AdminGuard>
  );
} 