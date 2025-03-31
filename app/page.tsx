import Link from "next/link";

export default function Home() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{
        backgroundImage: "url('https://www.pcc.edu.jm/img/blog-img/1.jpg')", // Corrected URL
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="bg-white bg-opacity-90 p-8 rounded-lg shadow-lg max-w-md w-full text-center">
        {/* Logo */}
        <img
         src="https://media-hosting.imagekit.io/be29cbf7d4be4b4b/logo.jpg?Expires=1837986288&Key-Pair-Id=K2ZIVPTIP2VGHC&Signature=NhmaqjhDNK7hafE01qp4AnyZDZeTuCWRMyJMujOU0ceNAjZ1I9rT23pvqUyBuyrIfu16xlHMU1uQEkQnNBKlBBD4Xp10~nOdIjmaG3B346wO4R-7vUivqE49WLsLxgjMUAzWrKmFXosZprN~JNh3Qdl5ryNz1e3OxPoc0OtVM3wDEFj6F9miCumCLUjtqq8Zxjp-sneyyaca6oDXJUYOkhEHiixJIeQO~3XIvyFVrYCUN8TVsnHoJx7BrsiZoJiDJ3sEAbA6toBsB3E2QVyEyvGy8OMgHmBvAqpnX8zbLjjVnxLymbm9XvIzPVCV~G-eSGYUPuLcee411RgvhVJDfA__" // Placeholder logo
          alt="ISMIS Logo"
          className="mx-auto mb-4"
          style={{ width: "150px", height: "auto" }}
        />
        
        {/* System Name and Version */}
        <h1 className="text-4xl font-bold text-red-900 mb-2">Welcome to ISMIS v1.0.0</h1>
        <p className="text-gray-600 mb-4">
          Integrated Student Management Information System
        </p>

        {/* Company Details */}
        <div className="text-gray-700 mb-6">
          <p><strong>Company:</strong> Dyno tech</p>
          <p><strong>Slogan:</strong> Dont be static be dynamic</p>
          <p><strong>Mission:</strong> Our mission is to deliver adaptable and innovative technology solutions that drive efficiency, empower growth, and inspire progress for businesses and individuals. By addressing unique challenges with cutting-edge IT services, we aim to transform operations and foster long-term success in an ever-evolving digital world."
          </p>
          <p><strong>Vision:</strong> A future where education systems are fully automated.</p>
        </div>

        {/* Problem and Solution */}
        <div className="text-gray-700 mb-6">
          <p><strong>The Problem:</strong> Manual student management is time-consuming and error-prone, leading to inefficiencies in tracking grades, payments, and clearances.</p>
          <p><strong>Our Solution:</strong> ISMIS provides role-based dashboards for students, teachers, and admins to manage grades, payments, and clearances seamlessly.</p>
        </div>

        {/* Login/Register Buttons */}
        <div className="flex justify-center space-x-4">
          <Link
            href="/auth/login"
            className="bg-red-900 text-pink-200 px-6 py-2 rounded hover:bg-red-800 transition-colors"
          >
            Login
          </Link>
          <Link
            href="/auth/register"
            className="bg-red-900 text-pink-200 px-6 py-2 rounded hover:bg-red-800 transition-colors"
          >
            Register
          </Link>
        </div>
      </div>
    </div>
  );
}