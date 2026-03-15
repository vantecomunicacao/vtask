import { useState } from 'react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Agenda() {
    const [currentDate, setCurrentDate] = useState(new Date());

    const daysInMonth = eachDayOfInterval({
        start: startOfMonth(currentDate),
        end: endOfMonth(currentDate)
    });

    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

    return (
        <div className="space-y-6 fade-in h-full flex flex-col">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-primary">Agenda</h1>

                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        className="gap-2 bg-white border border-[#e8e5e0] text-muted font-medium cursor-not-allowed opacity-60"
                        disabled
                        title="Integração em desenvolvimento"
                    >
                        <img src="https://www.google.com/images/branding/product/2x/calendar_48dp.png" alt="Google Calendar" className="w-4 h-4 grayscale" />
                        Sincronizar Google Calendar
                    </Button>
                    <Button size="sm" className="gap-2">
                        <span className="text-lg leading-none">+</span> Nova Tarefa
                    </Button>
                </div>
            </div>

            <Card className="flex-1 flex flex-col overflow-hidden bg-white">
                <div className="p-4 border-b border-border-subtle flex items-center justify-between bg-bg-main">
                    <h2 className="text-lg font-bold text-primary capitalize">
                        {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
                    </h2>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={prevMonth} className="bg-white">
                            <ChevronLeft size={18} />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date())} className="bg-white">
                            Hoje
                        </Button>
                        <Button variant="ghost" size="icon" onClick={nextMonth} className="bg-white">
                            <ChevronRight size={18} />
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-7 border-b border-border-subtle bg-bg-sidebar">
                    {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
                        <div key={day} className="py-2 text-center text-[11px] font-bold text-secondary uppercase tracking-widest border-r border-border-subtle last:border-0">
                            {day}
                        </div>
                    ))}
                </div>

                <div className="flex-1 grid grid-cols-7 grid-rows-5 bg-border-subtle gap-[1px]">
                    {/* Mock paddings for first day of month - simplificado para o visual */}
                    {Array.from({ length: startOfMonth(currentDate).getDay() }).map((_, i) => (
                        <div key={`empty-${i}`} className="bg-bg-sidebar/50 p-2 min-h-[100px]" />
                    ))}

                    {daysInMonth.map((date) => (
                        <div
                            key={date.toString()}
                            className={`bg-white p-2 min-h-[100px] hover:bg-bg-sidebar transition-colors cursor-pointer group flex flex-col ${!isSameMonth(date, currentDate) ? 'text-muted bg-bg-sidebar/50' : 'text-primary'
                                }`}
                        >
                            <div className="flex items-start justify-between">
                                <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${isToday(date) ? 'bg-brand text-white' : ''
                                    }`}>
                                    {format(date, 'd')}
                                </span>
                                <button className="opacity-0 group-hover:opacity-100 text-muted hover:text-brand transition-opacity">
                                    +
                                </button>
                            </div>

                            {/* Exemplo de task mock */}
                            {isToday(date) && (
                                <div className="mt-2 text-xs font-medium text-white bg-brand px-2 py-1 rounded truncate shadow-sm relative z-10 hover:opacity-90">
                                    Call Rebranding Vante
                                </div>
                            )}
                            {isToday(addMonths(date, -1)) && (
                                <div className="mt-2 text-xs font-medium text-secondary bg-bg-main border border-border-subtle px-2 py-1 rounded truncate">
                                    Entrega Ads (15:00)
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Fill remaining spaces */}
                    {Array.from({ length: 42 - daysInMonth.length - startOfMonth(currentDate).getDay() }).map((_, i) => (
                        <div key={`empty-end-${i}`} className="bg-bg-sidebar/50 p-2 min-h-[100px]" />
                    ))}
                </div>
            </Card>
        </div>
    );
}
