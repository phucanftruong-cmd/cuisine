import { Link } from "react-router";
import { formatPrice } from "../utils/format";
import PlaceImage from "./PlaceImage";

// preview: dùng trong form admin để xem trước, không phải link
export default function PlaceCard({ place, preview = false }) {
  const price = formatPrice(place);

  const content = (
    <>
      <PlaceImage
        src={place.imageUrl}
        alt={place.name}
        className="card-image"
        fallbackClassName="card-image--empty"
      />
      <div className="card-body">
        {place.category && <span className="badge">{place.category}</span>}
        <h3>{place.name}</h3>
        {place.address && <p className="muted">{place.address}</p>}
        <p className="card-meta">
          {price && <span>{price}</span>}
          {place.openingHours && <span>🕒 {place.openingHours}</span>}
        </p>
      </div>
    </>
  );

  if (preview) return <div className="card card--preview">{content}</div>;

  return (
    <Link to={`/places/${place.id}`} className="card">
      {content}
    </Link>
  );
}
