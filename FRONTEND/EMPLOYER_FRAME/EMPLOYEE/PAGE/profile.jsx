
export default function Profile() {
  return (
    <div className="min-h-screen bg-gray-100 flex justify-center items-center">
      
      <div className="bg-white p-8 rounded-2xl shadow-lg w-96">
        
        <h2 className="text-2xl font-bold mb-4">Profile</h2>

        <p><strong>Name:</strong> John Doe</p>
        <p><strong>Skills:</strong> React, Node.js</p>
        
        <div className="mt-4">
          <p className="font-semibold">Trust Score</p>
          <div className="bg-gray-200 rounded-full h-3 mt-1">
            <div className="bg-green-500 h-3 rounded-full w-4/5"></div>
          </div>
        </div>

      </div>
    </div>
  );
}