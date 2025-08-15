import Link from 'next/link';

export default function PreceptorDashboard() {
  return (
    <div className="mt-8">
      <h2 className="text-xl font-semibold mb-4">Preceptor Actions</h2>
      <div className="space-y-4">
        <Link href="/admin/subjects-classrooms">
          <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-full">
            Manage Subjects and Classrooms
          </button>
        </Link>
        <br/>
        <Link href="/preceptor/grades">
          <button className="cursor-pointer bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded w-full">
            View Grades for Classroom
          </button>
        </Link>
        <br/>
        <Link href="/preceptor/classrooms">
          <button className="cursor-pointer bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded w-full">
            Manage Classrooms
          </button>
        </Link>
        <br/>
        <Link href="/preceptor/students/create">
          <button className="cursor-pointer bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-full">
            Create Student
          </button>
        </Link>
      </div>
    </div>
  );
}