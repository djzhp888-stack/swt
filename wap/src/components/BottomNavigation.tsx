import { useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "@/contexts/authContext";
import { toast } from "sonner";

interface BottomNavigationProps {
  active: "dashboard" | "sales" | "profile";
}

export default function BottomNavigation({ active }: BottomNavigationProps) {
  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    if (window.confirm("确定要退出登录吗？")) {
      logout();
      navigate("/login");
      toast.success("已成功退出登录");
    }
  };

  const navItems = [
    {
      id: "dashboard",
      label: "仪表盘",
      icon: "fa-tachometer-alt",
      path: "/dashboard",
    },
    {
      id: "sales",
      label: "销售记录",
      icon: "fa-shopping-cart",
      path: "/sales",
    },
    {
      id: "profile",
      label: "我的",
      icon: "fa-user",
      path: "/profile",
    },
  ];

  return (
    <div className="bg-white border-t border-gray-200 p-2">
      <div className="flex justify-around items-center">
        {navItems.map((item) => (
          <Link
            key={item.id}
            to={item.path}
            className={`flex flex-col items-center justify-center py-2 px-4 rounded-xl transition ${
              active === item.id ? "text-blue-600" : "text-gray-500 hover:text-blue-500"
            }`}
          >
            <i className={`fa-solid ${item.icon} text-xl mb-1`}></i>
            <span className="text-xs">{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}