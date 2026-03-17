import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { Flame, Dumbbell, Apple, TrendingUp } from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";
import MacroChart from "@/components/dashboard/MacroChart";
import WeeklyChart from "@/components/dashboard/WeeklyChart";
import ProgressBar from "@/components/dashboard/ProgressBar";


const Dashboard = () => {
  
  const [intake, setIntake] = useState({
  calories: 0,
  protein: 0,
  carbs: 0,
  fats: 0,
});

  const [targets, setTargets] = useState({
  calories: 0,
  protein: 0,
  carbs: 0,
  fats: 0,
});
  const navigate = useNavigate();
useEffect(() => {
  const user = localStorage.getItem("user");
  if (!user) return;

  const { id } = JSON.parse(user);

  api
    .get(`/api/profile/${id}`)
    .then((res) => {
      setTargets(res.data.nutritionTargets);
      setIntake(res.data.dailyIntake);
    })
    .catch(console.error);
}, []);

  useEffect(() => {
    const user = localStorage.getItem("user");
    if (!user) {
      navigate("/login");
    }
  }, [navigate]);

    useEffect(() => {
    fetch("/api/test")
      .then(res => res.json())
      .then(data => console.log("API TEST:", data))
      .catch(err => console.error("API ERROR:", err));
  }, []);

  const weeklyWorkouts = [
    { day: "Mon", value: 45 },
    { day: "Tue", value: 60 },
    { day: "Wed", value: 0 },
    { day: "Thu", value: 55 },
    { day: "Fri", value: 75 },
    { day: "Sat", value: 40 },
    { day: "Sun", value: 0 },
  ];

  const weeklyVolume = [
    { day: "Mon", value: 12500 },
    { day: "Tue", value: 15200 },
    { day: "Wed", value: 0 },
    { day: "Thu", value: 14800 },
    { day: "Fri", value: 18500 },
    { day: "Sat", value: 9200 },
    { day: "Sun", value: 0 },
  ];

  const macroData = [
  {
    name: "Protein",
    value: targets.protein,
    color: "hsl(174 72% 50%)",
  },
  {
    name: "Carbs",
    value: targets.carbs,
    color: "hsl(38 92% 50%)",
  },
  {
    name: "Fats",
    value: targets.fats,
    color: "hsl(0 84% 60%)",
  },
];


  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold font-display text-foreground">Dashboard</h1>
        
        <p className="text-sm md:text-base text-muted-foreground mt-1">Your daily fitness overview</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard
          title="Today's Calories"
          value={intake.calories.toString()}
          subtitle={`of ${targets.calories} target`}
          icon={<Flame className="h-5 w-5 md:h-6 md:w-6" />}
          variant="primary"
          trend={{ value: 12, isPositive: true }}
        />
        <StatCard
          title="Protein Intake"
          value={`${intake.protein}g`}
          subtitle={`of ${targets.protein} target`}
          icon={<Apple className="h-5 w-5 md:h-6 md:w-6" />}
          variant="accent"
        />
        <StatCard
          title="Workouts This Week"
          value="5"
          subtitle="sessions completed"
          icon={<Dumbbell className="h-5 w-5 md:h-6 md:w-6" />}
          variant="primary"
          trend={{ value: 25, isPositive: true }}
        />
        <StatCard
          title="Weekly Volume"
          value="70,200"
          subtitle="lbs lifted"
          icon={<TrendingUp className="h-5 w-5 md:h-6 md:w-6" />}
          variant="warning"
          trend={{ value: 8, isPositive: true }}
        />
      </div>

      {/* Progress Section */}
      <div className="stat-card">
        <h3 className="text-base md:text-lg font-semibold font-display text-foreground mb-4 md:mb-6">
          Today's Progress
        </h3>
        <div className="space-y-4 md:space-y-6">
          <ProgressBar
          label="Calories"
          current={intake.calories}
          target={targets.calories}
        />

        <ProgressBar
          label="Protein"
          current={intake.protein}
          target={targets.protein}
          unit="g"
          variant="accent"
        />

        <ProgressBar
          label="Carbs"
          current={intake.carbs}
          target={targets.carbs}
          unit="g"
          variant="warning"
        />

        <ProgressBar
          label="Fats"
          current={intake.fats}
          target={targets.fats}
          unit="g"
          variant="destructive"
        />

        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <MacroChart data={macroData} title="Today's Macros" />
        <WeeklyChart
          data={weeklyWorkouts}
          title="Weekly Workout Duration (min)"
        />
        <WeeklyChart
          data={weeklyVolume}
          title="Weekly Training Volume (lbs)"
          color="hsl(142 70% 50%)"
        />
      </div>
    </div>
  );
};

export default Dashboard;
