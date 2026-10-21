import { useEffect, useState } from "react";
import { getPlaces } from "./api";

export default function App() {
  const [places, setPlaces] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPlaces()
      .then(setPlaces)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Đang tải...</p>;
  if (error) return <p>Không tải được dữ liệu: {error}</p>;

  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: 16 }}>
      <h1>Ẩm thực Quận 6</h1>
      {places.length === 0 && <p>Chưa có quán nào.</p>}
      <ul>
        {places.map((p) => (
          <li key={p.id}>
            <strong>{p.name}</strong>
            <p>{p.description}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}