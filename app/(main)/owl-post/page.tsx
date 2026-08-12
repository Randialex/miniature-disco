"use client";

import MailboxAuthGate from "@/components/MailboxAuthGate";
import MailboxDashboard from "@/components/MailboxDashboard";
import { useMailbox } from "@/components/MailboxProvider";

export default function OwlPostPage(){const {member}=useMailbox();return member?<MailboxDashboard/>:<MailboxAuthGate/>;}
