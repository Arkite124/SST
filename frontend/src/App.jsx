// src/App.jsx
import { RouterProvider } from "react-router-dom";
import router from "./router/index.jsx";
import useAuthLoad from "@/hooks/useAuthLoad.jsx";

function App() {
    useAuthLoad()
    return <RouterProvider router={router} />;
}

export default App;
