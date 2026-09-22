import {LoginView} from "./login/LoginView";
import logoImg from "../../../../assets/pmt.png";
 
 export const Auth = () => {
  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
     
      {/* LEFT IMAGE SECTION */}
      <div className="hidden md:flex items-center justify-center ">
        <img
          src={logoImg}
          alt="Login"
          className="w-[600px] h-auto object-cover"
        />
      </div>
 
      {/* RIGHT FORM SECTION */}
      <div className="flex items-center justify-center px-6">
        <div className="w-full max-w-md">
          <LoginView />
        </div>
      </div>
 
    </div>
  );
};

 