import LoginForm from "../ui/common/LoginForm";
import { Suspense } from "react";

export default function LoginPage() {
  return (
    <div className="page page-center">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
