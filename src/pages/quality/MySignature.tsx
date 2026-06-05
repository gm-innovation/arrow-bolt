import { PenLine } from "lucide-react";
import SignatureSection from "@/components/account/SignatureSection";

const MySignature = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <PenLine className="h-6 w-6" /> Minha Assinatura Eletrônica
        </h2>
      </div>
      <SignatureSection />
    </div>
  );
};

export default MySignature;
