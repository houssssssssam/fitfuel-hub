import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

interface WeeklyData {
  day: string;
  value: number;
}

interface WeeklyChartProps {
  data: WeeklyData[];
  title: string;
  dataKey?: string;
  color?: string;
}

const WeeklyChart = ({ data, title, color = "hsl(174 72% 50%)" }: WeeklyChartProps) => {
  return (
    <div className="stat-card">
      <h3 className="text-lg font-semibold font-display text-foreground mb-4">
        {title}
      </h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(215 20% 55%)", fontSize: 12 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(215 20% 55%)", fontSize: 12 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(220 18% 12%)",
                border: "1px solid hsl(220 14% 20%)",
                borderRadius: "8px",
                color: "hsl(210 40% 98%)",
              }}
            />
            <Bar
              dataKey="value"
              fill={color}
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default WeeklyChart;
