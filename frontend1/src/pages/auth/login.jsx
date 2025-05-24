import { signIn } from "next-auth/react";

export default function Login() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="bg-white p-8 rounded shadow-md w-96">
        <h2 className="text-2xl font-bold mb-6">Login</h2>
        <button
          className="w-full bg-green-600 text-white py-2 rounded"
          onClick={() => signIn("github")}
        >
          Sign in with GitHub
        </button>
      </div>
    </div>
  );
} 