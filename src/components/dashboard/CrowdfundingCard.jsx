import { useEffect, useState } from "react";
import { useLang } from "../../context/LanguageContext";
import api from "../../utils/api";
import { Rocket } from "lucide-react";

export default function CrowdfundingCard() {
  const { t } = useLang();
  const [stats, setStats] = useState(null);
  const [donors, setDonors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCrowdfunding = async () => {
      try {
        const [statsRes, donorsRes] = await Promise.all([
          api.get("/crowdfunding/stats"),
          api.get("/crowdfunding/donors")
        ]);
        if (statsRes.data.status === "ok") {
          setStats(statsRes.data.data);
        }
        if (donorsRes.data.status === "ok") {
          setDonors(donorsRes.data.data || []);
        }
      } catch (err) {
        console.error("Failed to fetch crowdfunding stats", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCrowdfunding();
  }, []);

  const total = stats?.totalCollected || 0;
  const goal = stats?.goalAmount || 5000;
  const pct = stats?.percentage || 0;
  const left = Math.max(0, goal - total);
  
  const donorsCount = donors?.length || stats?.donorsCount || 0;
  const remainingDays = stats?.dateEnd 
    ? Math.max(0, Math.ceil((new Date(stats.dateEnd) - new Date()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <div className="bg-white rounded-xl p-4 border border-[#e8ddd0]">
      <h3 className="text-[13px] font-bold text-[#3a2a1a] flex items-center gap-1.5 mb-3">
        <Rocket className="w-4 h-4 text-orange-500" /> {t.crowdfunding}
      </h3>

      <p className="text-3xl font-bold text-orange-500 leading-none">
        {loading ? "..." : `${total.toLocaleString()}€`}
      </p>
      <p className="text-[11px] text-[#9a8a7a] mt-1 mb-3">{t.goal} ({goal.toLocaleString()}€)</p>

      {/* Progress */}
      <div className="bg-[#f0e8d8] rounded-full h-2.5 overflow-hidden mb-4">
        <div
          className="h-full bg-[#8B6914] rounded-full transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { val: loading ? "..." : donorsCount, lbl: t.donors },
          { val: loading ? "..." : `${remainingDays}d`, lbl: t.remaining },
          { val: loading ? "..." : `${left.toLocaleString()}€`, lbl: t.left },
        ].map((s) => (
          <div
            key={s.lbl}
            className="bg-[#f5f0e8] rounded-lg p-2.5 text-center"
          >
            <p className="text-base font-bold text-[#3a2a1a]">{s.val}</p>
            <p className="text-[9px] text-[#9a8a7a] mt-0.5">{s.lbl}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
