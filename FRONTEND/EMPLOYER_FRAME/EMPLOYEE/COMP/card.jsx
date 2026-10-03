// components/JobCard.jsx
export default function JobCard({ job }) {
  return (
    <div className="bg-white p-5 rounded-2xl shadow-md hover:shadow-xl transition">
      
      <h3 className="text-xl font-semibold mb-2">{job.title}</h3>
      
      <p className="text-gray-600 mb-3">{job.description}</p>

      <div className="flex justify-between items-center">
        <span className="text-green-600 font-bold">{job.salary}</span>
        
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          Apply
        </button>
      </div>
    </div>
  );
}