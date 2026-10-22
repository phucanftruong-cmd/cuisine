import { Link } from "react-router";
import { formatPrice } from "../utils/format";

export default function PlaceCard({ place }) {
  const price = formatPrice(place);

  return (
    <Link to={`/places/${place.id}`} className="card">
      {place.imageUrl ? (
        <img
          src={place.imageUrl}
          alt={place.name}
          className="card-image"
          loading="lazy"
        />
      ) : (
        <div className="card-image card-image--empty">🍜</div>
      )}
      <div className="card-body">
        {place.category && <span className="badge">{place.category}</span>}
        <h3>{place.name}</h3>
        {place.address && <p className="muted">{place.address}</p>}
        <p className="card-meta">
          {price && <span>{price}</span>}
          {place.openingHours && <span>🕒 {place.openingHours}</span>}
        </p>
      </div>
    </Link>
  );
}