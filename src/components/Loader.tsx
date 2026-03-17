const Loader = () => {
  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
      <div className="relative w-14 h-14">
        {Array.from({ length: 8 }).map((_, i) => (
          <span
            key={i}
            className="absolute w-2.5 h-2.5 bg-primary rounded-full animate-pulse"
            style={{
              top: "50%",
              left: "50%",
              transform: `rotate(${i * 45}deg) translate(22px)`,
              transformOrigin: "center",
              animationDelay: `${i * 0.1}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default Loader;
