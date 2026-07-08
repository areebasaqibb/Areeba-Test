export async function GET() {
  const sampleProducts = [
    {
      id: 1,
      name: "Chocolate Lava Cake",
      description: "Rich dark chocolate cake with a molten, gooey center.",
      sellingPrice: 8.99,
      imageUrl: "https://example.com/images/lava-cake.jpg"
    },
    {
      id: 2,
      name: "Strawberry NY Cheesecake",
      description: "Classic, creamy New York style cheesecake topped with fresh glazed strawberries.",
      sellingPrice: 6.50,
      imageUrl: "https://example.com/images/strawberry-cheesecake.jpg"
    },
    {
      id: 3,
      name: "Vanilla Bean Macarons",
      description: "Box of 6 delicate, melt-in-your-mouth french macarons filled with vanilla buttercream.",
      sellingPrice: 12.00,
      imageUrl: "https://example.com/images/vanilla-macarons.jpg"
    }
  ];

  return Response.json(sampleProducts);
}
