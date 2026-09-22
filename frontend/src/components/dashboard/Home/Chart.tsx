

interface DonutChartProps {
  stats: {
    Todo: number;
    InProgress: number;
    Completed: number;
    Delay: number;
  };
  size?: number;
}

const DonutChart = ({ stats, size = 160 }: DonutChartProps) => {
  // Map the stats to the format the chart expects
  const data = [
    { label: 'Todo', value: stats.Todo, color: '#3B82F6' },        
    { label: 'In Progress', value: stats.InProgress, color: '#F59E0B' }, 
    { label: 'Completed', value: stats.Completed, color: '#10B981' },  
    { label: 'Delay', value: stats.Delay, color: '#EF4444' },
  ];

  const total = data.reduce((acc, item) => acc + item.value, 0);
  const center = size / 2;
  const radius = size * 0.35; // Responsive radius
  const circumference = 2 * Math.PI * radius;
  
  let cumulativeOffset = 0;

  // Handle empty state
  if (total === 0) {
    return (
      <div className="flex items-center justify-center text-gray-300 text-xs italic" style={{ width: size, height: size }}>
        No tasks
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
          {data.map((item, index) => {
            if (item.value === 0) return null;

            const percentage = (item.value / total) * 100;
            const strokeLength = (percentage / 100) * circumference;
            const offset = (cumulativeOffset / 100) * circumference;
            cumulativeOffset += percentage;

            return (
              <circle
                key={index}
                cx={center}
                cy={center}
                r={radius}
                fill="transparent"
                stroke={item.color}
                strokeWidth={size * 0.12}
                strokeDasharray={`${strokeLength} ${circumference}`}
                strokeDashoffset={-offset}
                strokeLinecap={total === item.value ? "butt" : "round"}
                style={{ transition: 'all 0.5s ease' }}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-gray-800 leading-none">{total}</span>
          <span className="text-[10px] text-gray-400 uppercase font-medium">Tasks</span>
        </div>
      </div>
    </div>
  );
};

export default DonutChart;