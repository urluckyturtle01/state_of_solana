"use client";

import './globals.css';
import Counter from "./components/shared/Counter";
import { ChartIcon, TvlIcon, ExchangeIcon } from "./components/shared/Icons";
import Layout from "./components/Layout";
import OverviewTabsHeader from "./(overview)/components/OverviewTabsHeader";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Overview from './(overview)/page';

export default function Home() {
  // For static exports, just render the Overview content directly
  return <Overview />;
} 