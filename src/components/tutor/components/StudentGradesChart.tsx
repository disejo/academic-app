'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

// --- Helper Hook for Theme Detection ---
const useTheme = () => {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    // Helper to check the theme
    const checkTheme = () => {
      // 1. Check for theme set by Tailwind CSS on the html tag
      if (document.documentElement.classList.contains('dark')) {
        return 'dark';
      }
      // 2. Check for system preference
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    };

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => setTheme(checkTheme());

    handleChange(); // Set initial theme
    mediaQuery.addEventListener('change', handleChange);

    // Also, use a MutationObserver to watch for class changes on <html>
    const observer = new MutationObserver(handleChange);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => {
        mediaQuery.removeEventListener('change', handleChange);
        observer.disconnect();
    }
  }, []);

  return theme;
};


// --- Chart Data Interfaces ---
interface ChartData {
  subjectName: string;
  grade: number;
  trimester: number;
}

interface StudentGradesChartProps {
  studentId: string;
  studentName: string;
}

// --- Color Logic ---
const getGradeColor = (grade: number) => {
  if (grade <= 4) return '#ef4444'; // red-500
  if (grade > 4 && grade < 7) return '#f59e0b'; // amber-500
  return '#22c55e'; // green-500
};

const themeColors = {
  light: {
    text: '#374151', // gray-700
    grid: '#e5e7eb', // gray-200
    tooltip: {
      backgroundColor: '#ffffff',
      border: '#e5e7eb',
    }
  },
  dark: {
    text: '#d1d5db', // gray-300
    grid: '#4b5563', // gray-600
    tooltip: {
        backgroundColor: '#1f2937',
        border: '#4b5563',
    }
  }
};


// --- Main Component ---
const StudentGradesChart = ({ studentId, studentName }: StudentGradesChartProps) => {
  const [allGrades, setAllGrades] = useState<ChartData[]>([]);
  const [trimester, setTrimester] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const theme = useTheme();
  const colors = themeColors[theme as keyof typeof themeColors] || themeColors.light;

  useEffect(() => {
    const fetchGrades = async () => {
      setLoading(true);
      try {
        const subjectsSnapshot = await getDocs(collection(db, 'subjects'));
        const subjectMap = new Map<string, string>();
        subjectsSnapshot.forEach(doc => {
          subjectMap.set(doc.id, doc.data().name);
        });

        const gradesQuery = query(collection(db, 'grades'), where('studentId', '==', studentId));
        const gradesSnapshot = await getDocs(gradesQuery);

        const studentGrades = gradesSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            subjectName: subjectMap.get(data.subjectId) || 'Desconocido',
            grade: data.grade,
            trimester: data.trimester,
          };
        });

        setAllGrades(studentGrades);
      } catch (error) {
        console.error("Error fetching student grades: ", error);
      }
      setLoading(false);
    };

    fetchGrades();
  }, [studentId]);

  const filteredData = allGrades.filter(data => data.trimester === trimester);

  if (loading) {
    return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md w-full h-[400px] flex justify-center items-center">
        <div className="flex justify-center items-center py-12">
           <span className="w-16 h-16 border-4 border-blue-500 border-dashed rounded-full animate-spin"></span>
        </div>
        </div>
    );
  }

  return (
    <div className='dark:bg-gray-700 mb-8 rounded-lg overflow-hidden p-4'>
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md w-full h-full flex flex-col min-h-[400px]">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{studentName}</h3>
      <div className="mb-4">
        <label htmlFor={`trimester-select-${studentId}`} className="mr-2 font-medium text-gray-700 dark:text-gray-300">Trimestre: </label>
        <select 
          id={`trimester-select-${studentId}`} 
          value={trimester} 
          onChange={(e) => setTrimester(Number(e.target.value))}
          className="p-2 border rounded-md bg-gray-200 dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value={1}>Primero</option>
          <option value={2}>Segundo</option>
          <option value={3}>Tercer</option>
        </select>
      </div>
      <div className="flex-grow">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={filteredData}
            margin={{ top: 5, right: 20, left: -15, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
            <XAxis dataKey="subjectName" tick={{ fill: colors.text }} fontSize={12} interval={0} angle={-35} textAnchor="end" height={70} />
            <YAxis type="number" domain={[0, 10]} tick={{ fill: colors.text }} />
            <Tooltip 
              contentStyle={{ 
                  backgroundColor: colors.tooltip.backgroundColor, 
                  border: `1px solid ${colors.tooltip.border}`,
              }}
              labelStyle={{ fontWeight: 'bold', color: colors.text }}
              itemStyle={{ color: colors.text }}
            />
            <Legend wrapperStyle={{ color: colors.text, paddingTop: '10px' }}/>
            <Bar dataKey="grade" name="Calificacion" fill="#8884d8" barSize={10}>
              {filteredData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getGradeColor(entry.grade)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
    </div>
  );
};

export default StudentGradesChart;
