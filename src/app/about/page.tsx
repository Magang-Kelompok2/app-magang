import Image from "next/image";

export default function AboutPage() {
  return (
    <main
      style={{
        padding: "40px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <p style={{ marginBottom: "20px" }}>
        Orang GANTENG KEREN NAN BAIK HATI
      </p>

      <Image
        src="/WIN_20260408_16_04_26_Pro.jpg"
        alt="Preview"
        width={1800}
        height={1200}
        style={{
          borderRadius: "40px",
          objectFit: "cover",
        }}
      />
    </main>
  );
}