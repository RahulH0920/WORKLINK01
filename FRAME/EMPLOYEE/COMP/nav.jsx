import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <nav className="flex justify-between items-center px-8 py-4 bg-white shadow-md">
      <h1 className="text-2xl font-bold text-blue-600">WorkLink</h1>

      <div className="flex gap-6 font-medium">
        <Link to="/" className="hover:text-blue-600">Home</Link>
        <Link to="/dashboard" className="hover:text-blue-600">Dashboard</Link>
        <Link to="/profile" className="hover:text-blue-600">Profile</Link>
      </div>

      <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
        Login
      </button>
    </nav>
  );
}