import axios from "axios";
import { createContext, useEffect, useState } from "react";
import Cookies from "js-cookie";

export const UserContext = createContext({});

export function UserContextProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [role, setRole] = useState(null);
  const apiUrl = process.env.REACT_APP_API_URL;

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        const token = Cookies.get('token');
        if (token) {
          const response = await axios.get(`${apiUrl}/api/v1/auth/getuser`, {
            headers: {
              Authorization: `${token}`,
            },
          });

          setUser(response.data.user);
          setRole(response.data.role);
        }
      } catch (error) {
        console.error('Error fetching user details:', error);
      } finally {
        setReady(true); // ✅ THE FIX
      }
    };

    fetchUserDetails();
  }, []);

  return (
    <UserContext.Provider value={{ user, setUser, role, ready }}>
      {children}
    </UserContext.Provider>
  );
}
