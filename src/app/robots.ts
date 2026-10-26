import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        // Internal Studio OS routes handling proprietary drawings, payroll, and employee records
        // must never be crawled or indexed by public search engines
        disallow: [
          "/api/",
          "/w/",
          "/admin/",
          "/login",
          "/profile",
          "/dashboard",
          "/tasks",
          "/projects",
          "/drawings",
          "/attendance",
          "/payroll",
          "/storage/",
        ],
        allow: ["/$"],
      },
    ],
  };
}
