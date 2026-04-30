import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#f2f2f7] flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white rounded-[2rem] shadow-2xl p-8 text-center">
        <h1 className="text-4xl font-bold text-slate-900">
          SafeChat for Families
        </h1>

        <p className="mt-4 text-lg text-slate-600">
          A kid-friendly messaging app designed for children and their trusted
          adults to stay connected in a safe, simple, and private space.
        </p>

        <div className="mt-8 grid md:grid-cols-3 gap-4 text-left">
          <div className="bg-slate-50 rounded-2xl p-5">
            <h3 className="font-bold text-slate-900">Kid Friendly</h3>
            <p className="text-sm text-slate-600 mt-2">
              Simple design, easy messaging, and a calm space made for young
              users.
            </p>
          </div>

          <div className="bg-slate-50 rounded-2xl p-5">
            <h3 className="font-bold text-slate-900">Trusted Adults</h3>
            <p className="text-sm text-slate-600 mt-2">
              Kids can chat with parents, guardians, relatives, mentors, or
              other approved adults.
            </p>
          </div>

          <div className="bg-slate-50 rounded-2xl p-5">
            <h3 className="font-bold text-slate-900">Private DMs</h3>
            <p className="text-sm text-slate-600 mt-2">
              Conversations happen in private message rooms between selected
              users.
            </p>
          </div>
        </div>

        <div className="mt-8 flex justify-center gap-3">
          <Link
            to="/register"
            className="rounded-full bg-[#007aff] px-6 py-3 text-white font-semibold hover:bg-blue-600"
          >
            Create Account
          </Link>

          <Link
            to="/login"
            className="rounded-full bg-slate-200 px-6 py-3 text-slate-800 font-semibold hover:bg-slate-300"
          >
            Login
          </Link>
        </div>

        <p className="mt-6 text-xs text-slate-400">
          Built as a family-focused chat project with privacy and simplicity in
          mind.
        </p>
      </div>
    </div>
  );
}
