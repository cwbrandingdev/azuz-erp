import { LoginBrandShowcase } from "../login/components/LoginBrandShowcase";
import { SignupForm } from "./components/SignupForm";

export default function SignupPage() {
  return (
    <div className="flex min-h-screen w-full">
      <LoginBrandShowcase />
      <div className="flex w-full flex-1 items-center justify-center px-6 py-12 lg:px-12">
        <div className="w-full max-w-md">
          <SignupForm />
        </div>
      </div>
    </div>
  );
}
