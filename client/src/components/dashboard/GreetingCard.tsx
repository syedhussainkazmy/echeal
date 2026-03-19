import { useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';

interface WeatherInfo {
    city: string;
    country: string;
    temp: number;
    description: string;
    emoji: string;
}

function resolveWMO(code: number): { desc: string; emoji: string } {
    if (code === 0) return { desc: 'Clear sky', emoji: '☀️' };
    if (code <= 3) return { desc: 'Partly cloudy', emoji: '⛅' };
    if (code <= 9) return { desc: 'Overcast', emoji: '☁️' };
    if (code <= 19) return { desc: 'Precipitation nearby', emoji: '🌦️' };
    if (code <= 29) return { desc: 'Precipitation', emoji: '🌧️' };
    if (code <= 39) return { desc: 'Drizzle', emoji: '🌦️' };
    if (code <= 49) return { desc: 'Foggy', emoji: '🌫️' };
    if (code <= 57) return { desc: 'Drizzle', emoji: '🌦️' };
    if (code <= 67) return { desc: 'Rain', emoji: '🌧️' };
    if (code <= 77) return { desc: 'Snow', emoji: '❄️' };
    if (code <= 82) return { desc: 'Rain showers', emoji: '🌦️' };
    if (code <= 86) return { desc: 'Snow showers', emoji: '🌨️' };
    return { desc: 'Thunderstorm', emoji: '⛈️' };
}

function getGreeting(name: string): { message: string; emoji: string } {
    const h = new Date().getHours();
    if (h >= 5 && h < 12) return { message: `Good morning, ${name}`, emoji: '🌤️' };
    if (h >= 12 && h < 17) return { message: `Good afternoon, ${name}`, emoji: '☀️' };
    if (h >= 17 && h < 21) return { message: `Good evening, ${name}`, emoji: '🌆' };
    return { message: `Good night, ${name}`, emoji: '🌙' };
}

interface GreetingCardProps {
    name: string;
    subtitle?: string;
}

export default function GreetingCard({ name, subtitle }: GreetingCardProps) {
    const [weather, setWeather] = useState<WeatherInfo | null>(null);
    const greeting = getGreeting(name);

    useEffect(() => {
        let cancelled = false;
        async function load() {
            try {
                const geo = await fetch('https://ipapi.co/json/').then(r => r.json());
                const { city, country_name, latitude, longitude } = geo;
                const wx = await fetch(
                    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code`
                ).then(r => r.json());
                if (cancelled) return;
                const code: number = wx.current?.weather_code ?? wx.current?.weathercode ?? 0;
                const wmo = resolveWMO(code);
                setWeather({
                    city: city || 'Unknown',
                    country: country_name || '',
                    temp: Math.round(wx.current.temperature_2m),
                    description: wmo.desc,
                    emoji: wmo.emoji,
                });
            } catch {
                // location/weather is best-effort, silently ignore
            }
        }
        load();
        return () => { cancelled = true; };
    }, []);

    return (
        <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
                <div className="flex items-center gap-2.5">
                    <span className="text-2xl leading-none">{greeting.emoji}</span>
                    <h1 className="text-2xl font-bold text-gray-900">{greeting.message}</h1>
                </div>
                {subtitle && <p className="text-gray-500 mt-1">{subtitle}</p>}
            </div>
            {weather && (
                <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-md px-4 py-2.5">
                    <span className="text-xl leading-none">{weather.emoji}</span>
                    <div>
                        <p className="text-sm font-medium text-gray-700">{weather.temp}°C · {weather.description}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3 text-gray-400" />
                            <p className="text-xs text-gray-400">{weather.city}, {weather.country}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
