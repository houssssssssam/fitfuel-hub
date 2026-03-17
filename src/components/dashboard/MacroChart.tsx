import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface MacroData {
  name: string;
  value: number;
  color: string;
}

interface MacroChartProps {
  data: MacroData[];
  title?: string;
}

const MacroChart = ({ data, title }: MacroChartProps) => {
  return (
    <div className="stat-card">
      {title && (
        <h3 className="text-lg font-semibold font-display text-foreground mb-4">
          {title}
        </h3>
      )}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={4}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(220 18% 12%)",
                border: "1px solid hsl(220 14% 20%)",
                borderRadius: "8px",
                color: "hsl(210 40% 98%)",
              }}
              formatter={(value: number) => [`${value}g`, ""]}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value) => (
                <span className="text-sm text-muted-foreground">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default MacroChart;
