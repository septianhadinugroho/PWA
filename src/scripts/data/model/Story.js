export class Story {
  constructor({ id, name, description, photoUrl, createdAt, lat, lon }) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.photoUrl = photoUrl;
    this.createdAt = createdAt;
    this.lat = lat;
    this.lon = lon;
  }
}