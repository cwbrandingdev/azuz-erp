export function isRouteActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  if (href === "/content/management") {
    return (
      pathname === "/content/management" ||
      pathname.startsWith("/content/")
    );
  }
  if (href === "/creation") {
    return pathname === "/creation" || pathname.startsWith("/content/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
