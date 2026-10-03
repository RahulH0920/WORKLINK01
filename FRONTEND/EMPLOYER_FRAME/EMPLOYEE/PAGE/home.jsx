
export default function Home() {
  return (
    <div className="h-screen flex flex-col justify-center items-center text-center bg-gradient-to-r from-blue-500 to-purple-600 text-white">
      
      <h1 className="text-5xl font-bold mb-4">
        Find Trusted Gigs Instantly
      </h1>

      <p className="text-lg mb-6">
        Verified workers. Secure hiring. Smart trust scoring.
      </p>

      <button className="bg-white text-blue-600 px-6 py-3 rounded-xl font-semibold hover:scale-105 transition">
        Get Started
      </button>
    </div>
  );
}