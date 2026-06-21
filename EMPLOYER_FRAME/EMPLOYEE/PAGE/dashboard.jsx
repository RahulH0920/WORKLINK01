
import JobCard from "../components/JobCard";

const jobs = [
  { title: "Event Helper", description: "Assist in event setup", salary: "₹500/day" },
  { title: "Delivery Assistant", description: "Local delivery work", salary: "₹300/day" },
  { title: "Tutor", description: "Teach basic math", salary: "₹400/hr" }
];

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      
      <h2 className="text-3xl font-bold mb-6">Available Jobs</h2>

      <div className="grid md:grid-cols-3 gap-6">
        {jobs.map((job, i) => (
          <JobCard key={i} job={job} />
        ))}
      </div>

    </div>
  );
}