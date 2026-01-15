import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./index.css";
import Collections from "./pages/Collections";
import ContactCalendarEmbed from "./pages/ContactCalendarEmbed";
import Home from "./pages/Home";
import Layout from "./pages/Layout";
import Login from "./pages/Login";
import MagicLinkFlow from "./pages/MagicLinkFlow";
import PublicCalendarEmbed from "./pages/PublicCalendarEmbed";
import SermonImportPage from "./pages/SermonImportPage";
import Sermons from "./pages/Sermons";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: "sermons", element: <Sermons /> },
      { path: "sermons/import", element: <SermonImportPage /> },
      { path: "collections", element: <Collections /> },
    ],
  },
  { path: "login", element: <Login /> },
  { path: "login/instructions", element: <MagicLinkFlow /> },
  {
    path: "calendar/embed",
    element: <PublicCalendarEmbed />,
  },
  {
    path: "calendar/contact",
    element: <ContactCalendarEmbed />,
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
