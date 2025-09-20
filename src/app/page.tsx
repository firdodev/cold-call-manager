'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AnimatedCircularProgressBar } from '@/components/ui/animated-circular-progress-bar';
import { Upload, Phone, CheckCircle, XCircle, Clock, SkipForward, Download, Sparkles } from 'lucide-react';

interface Lead {
  id: number;
  name: string;
  phone: string;
  status: 'pending' | 'interested' | 'not-interested' | 'no-answer' | 'callback' | 'completed';
  notes?: string;
}

const statusConfig = {
  pending: { label: 'Pending', color: 'bg-white/20 text-white', hexColor: '#ffffff40', icon: Clock },
  interested: { label: 'Interested', color: 'bg-green-500/80 text-white', hexColor: '#10b981', icon: CheckCircle },
  'not-interested': { label: 'Not Interested', color: 'bg-red-500/80 text-white', hexColor: '#ef4444', icon: XCircle },
  'no-answer': { label: 'No Answer', color: 'bg-yellow-500/80 text-white', hexColor: '#f59e0b', icon: Phone },
  callback: { label: 'Callback', color: 'bg-blue-500/80 text-white', hexColor: '#3b82f6', icon: Clock },
  completed: { label: 'Completed', color: 'bg-purple-500/80 text-white', hexColor: '#8b5cf6', icon: CheckCircle }
};

export default function Home() {
  const [excelData, setExcelData] = useState<Record<string, unknown>[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [nameColumn, setNameColumn] = useState<string>('');
  const [phoneColumn, setPhoneColumn] = useState<string>('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [currentLeadIndex, setCurrentLeadIndex] = useState(0);
  const [step, setStep] = useState<'upload' | 'configure' | 'calling'>('upload');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = e => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length > 0) {
          setExcelData(jsonData as Record<string, unknown>[]);
          setColumns(Object.keys(jsonData[0] as Record<string, unknown>));
          setStep('configure');
        }
      };
      reader.readAsArrayBuffer(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    multiple: false
  });

  const handleConfigureComplete = () => {
    if (nameColumn && phoneColumn) {
      const processedLeads: Lead[] = excelData.map((row, index) => ({
        id: index + 1,
        name: String(row[nameColumn] || 'Unknown'),
        phone: String(row[phoneColumn] || 'No Phone'),
        status: 'pending'
      }));
      setLeads(processedLeads);
      setStep('calling');
    }
  };

  const updateLeadStatus = (status: Lead['status'], notes?: string) => {
    setLeads(prev => prev.map((lead, index) => (index === currentLeadIndex ? { ...lead, status, notes } : lead)));

    // Automatically move to next lead after updating status
    setTimeout(() => {
      if (currentLeadIndex < leads.length - 1) {
        setCurrentLeadIndex(currentLeadIndex + 1);
      }
    }, 500); // Small delay to show the status update
  };

  const nextLead = () => {
    if (currentLeadIndex < leads.length - 1) {
      setCurrentLeadIndex(currentLeadIndex + 1);
    }
  };

  const previousLead = () => {
    if (currentLeadIndex > 0) {
      setCurrentLeadIndex(currentLeadIndex - 1);
    }
  };

  const currentLead = leads[currentLeadIndex];

  const getStatusCounts = () => {
    return leads.reduce((acc, lead) => {
      acc[lead.status] = (acc[lead.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  };

  const getCompletionPercentage = () => {
    const completedCount = leads.filter(lead => lead.status !== 'pending').length;
    return leads.length > 0 ? Math.round((completedCount / leads.length) * 100) : 0;
  };

  const exportToExcel = () => {
    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();

    // Prepare data for export
    const exportData = leads.map(lead => ({
      Phone: lead.phone,
      Status: statusConfig[lead.status].label,
      BusinessName: lead.name
    }));

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(exportData);

    // Add styling information (this will be handled by Excel when opened)
    // const range = XLSX.utils.decode_range(ws['!ref']!);

    // Add the worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Cold Call Results');

    // Generate Excel file buffer
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

    // Create blob and save file
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(data, 'cold-call-results.xlsx');
  };

  if (step === 'upload') {
    return (
      <div className='min-h-screen flex items-center justify-center p-6'>
        <div className='fade-in'>
          <Card className='w-full max-w-md glass-card'>
            <CardHeader className='text-center'>
              <CardTitle className='flex items-center justify-center gap-3 text-2xl text-white'>
                <div className='p-2 rounded-full bg-white/10 backdrop-blur-md'>
                  <Sparkles className='h-6 w-6' />
                </div>
                Cold Call Manager
              </CardTitle>
              <CardDescription className='text-white/70 text-base'>
                Upload an Excel file to start managing your cold calls with style
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 ${
                  isDragActive
                    ? 'border-white/60 bg-white/10 backdrop-blur-md scale-105'
                    : 'border-white/30 hover:border-white/50 hover:bg-white/5 hover:backdrop-blur-md'
                }`}
              >
                <input {...getInputProps()} />
                <div className='bounce-in'>
                  <Upload className='h-16 w-16 mx-auto mb-6 text-white/60' />
                </div>
                {isDragActive ? (
                  <p className='text-white text-lg font-medium'>Drop it like it&apos;s hot! 🔥</p>
                ) : (
                  <div className='space-y-2'>
                    <p className='text-white text-lg font-medium'>Drag & drop your Excel file here</p>
                    <p className='text-white/60'>or click to browse • Supports .xlsx and .xls files</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (step === 'configure') {
    return (
      <div className='min-h-screen p-6'>
        <div className='max-w-5xl mx-auto fade-in'>
          <Card className='glass-card'>
            <CardHeader>
              <CardTitle className='text-white text-2xl flex items-center gap-3'>
                <div className='p-2 rounded-full bg-white/10 backdrop-blur-md'>
                  <Sparkles className='h-5 w-5' />
                </div>
                Configure Your Data
              </CardTitle>
              <CardDescription className='text-white/70 text-base'>
                Tell us which columns contain the business names and phone numbers
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-8'>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                <div className='space-y-3'>
                  <Label className='text-white font-medium text-base'>Business Name Column</Label>
                  <Select value={nameColumn} onValueChange={setNameColumn}>
                    <SelectTrigger className='glass-button text-white'>
                      <SelectValue placeholder='Select name column' />
                    </SelectTrigger>
                    <SelectContent className='glass-card border-white/20'>
                      {columns.map(column => (
                        <SelectItem key={column} value={column} className='text-white hover:bg-white/10'>
                          {column}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className='space-y-3'>
                  <Label className='text-white font-medium text-base'>Phone Number Column</Label>
                  <Select value={phoneColumn} onValueChange={setPhoneColumn}>
                    <SelectTrigger className='glass-button text-white'>
                      <SelectValue placeholder='Select phone column' />
                    </SelectTrigger>
                    <SelectContent className='glass-card border-white/20'>
                      {columns.map(column => (
                        <SelectItem key={column} value={column} className='text-white hover:bg-white/10'>
                          {column}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className='space-y-4'>
                <h3 className='text-xl font-semibold text-white'>Preview Your Data</h3>
                <div className='glass-card rounded-xl overflow-hidden'>
                  <Table>
                    <TableHeader>
                      <TableRow className='border-white/10 hover:bg-white/5'>
                        {columns.map(column => (
                          <TableHead key={column} className='text-white/80 font-medium'>
                            {column}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {excelData.slice(0, 5).map((row, index) => (
                        <TableRow key={index} className='border-white/10 hover:bg-white/5'>
                          {columns.map(column => (
                            <TableCell key={column} className='text-white/90'>
                              {String(row[column] || '')}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {excelData.length > 5 && (
                  <p className='text-white/60 text-center'>Showing 5 of {excelData.length} rows • Looking good! 🎉</p>
                )}
              </div>

              <div className='flex justify-between items-center pt-4'>
                <Button variant='outline' onClick={() => setStep('upload')} className='glass-button text-white'>
                  ← Back
                </Button>
                <Button
                  onClick={handleConfigureComplete}
                  disabled={!nameColumn || !phoneColumn}
                  className='primary-button px-8'
                >
                  Start Calling →
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen p-6'>
      <div className='max-w-7xl mx-auto space-y-6'>
        {/* Header with Progress */}
        <Card className='glass-card fade-in'>
          <CardHeader>
            <CardTitle className='flex items-center justify-between text-white'>
              <span className='flex items-center gap-3 text-2xl'>
                <div className='p-2 rounded-full bg-white/10 backdrop-blur-md'>
                  <Phone className='h-6 w-6' />
                </div>
                Cold Call Manager
              </span>
              <div className='flex items-center gap-8'>
                <div className='flex gap-3 flex-wrap'>
                  {Object.entries(getStatusCounts()).map(([status, count]) => {
                    const config = statusConfig[status as keyof typeof statusConfig];
                    return (
                      <Badge key={status} className={`${config.color} backdrop-blur-md px-3 py-1 text-sm font-medium`}>
                        {config.label}: {count}
                      </Badge>
                    );
                  })}
                </div>
                <div className='flex items-center gap-6'>
                  <div className='text-center'>
                    <AnimatedCircularProgressBar
                      value={getCompletionPercentage()}
                      gaugePrimaryColor='#ffffff'
                      gaugeSecondaryColor='#ffffff20'
                      className='size-20 text-base'
                    />
                    <p className='text-white/60 text-xs mt-1'>Progress</p>
                  </div>
                  <Button onClick={exportToExcel} className='primary-button' disabled={getCompletionPercentage() < 100}>
                    <Download className='h-4 w-4 mr-2' />
                    Export Results
                  </Button>
                </div>
              </div>
            </CardTitle>
            <CardDescription className='text-white/70 text-base'>
              Lead {currentLeadIndex + 1} of {leads.length} • {getCompletionPercentage()}% Complete • You&apos;re doing
              amazing! 🚀
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Current Lead */}
        {currentLead && (
          <div className='grid grid-cols-1 xl:grid-cols-2 gap-6'>
            <Card className='glass-card slide-up'>
              <CardHeader>
                <CardTitle className='text-white text-xl flex items-center gap-2'>
                  <div className='p-1.5 rounded-full bg-white/10 backdrop-blur-md'>
                    <Phone className='h-4 w-4' />
                  </div>
                  Current Lead
                </CardTitle>
              </CardHeader>
              <CardContent className='space-y-6'>
                <div className='space-y-2'>
                  <Label className='text-white/70 text-sm font-medium'>Business Name</Label>
                  <div className='text-3xl font-bold text-white tracking-tight'>{currentLead.name}</div>
                </div>
                <div className='space-y-2'>
                  <Label className='text-white/70 text-sm font-medium'>Phone Number</Label>
                  <div className='text-2xl font-mono text-white bg-white/5 rounded-lg p-4 backdrop-blur-md border border-white/10'>
                    {currentLead.phone}
                  </div>
                </div>
                <div className='space-y-2'>
                  <Label className='text-white/70 text-sm font-medium'>Current Status</Label>
                  <div className='flex items-center gap-3'>
                    {(() => {
                      const config = statusConfig[currentLead.status];
                      const Icon = config.icon;
                      return (
                        <Badge className={`${config.color} backdrop-blur-md px-4 py-2 text-base font-medium`}>
                          <Icon className='h-4 w-4 mr-2' />
                          {config.label}
                        </Badge>
                      );
                    })()}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className='glass-card slide-up'>
              <CardHeader>
                <CardTitle className='text-white text-xl'>Update Call Status</CardTitle>
                <CardDescription className='text-white/70'>
                  How did the call go? Click to update and automatically move to the next lead.
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-6'>
                <div className='grid grid-cols-2 gap-3'>
                  <Button
                    onClick={() => updateLeadStatus('interested')}
                    className='status-button bg-green-500/20 text-green-100 hover:bg-green-500/30 border-green-500/30 h-12'
                  >
                    <CheckCircle className='h-5 w-5 mr-2' />
                    Interested
                  </Button>
                  <Button
                    onClick={() => updateLeadStatus('not-interested')}
                    className='status-button bg-red-500/20 text-red-100 hover:bg-red-500/30 border-red-500/30 h-12'
                  >
                    <XCircle className='h-5 w-5 mr-2' />
                    Not Interested
                  </Button>
                  <Button
                    onClick={() => updateLeadStatus('no-answer')}
                    className='status-button bg-yellow-500/20 text-yellow-100 hover:bg-yellow-500/30 border-yellow-500/30 h-12'
                  >
                    <Phone className='h-5 w-5 mr-2' />
                    No Answer
                  </Button>
                  <Button
                    onClick={() => updateLeadStatus('callback')}
                    className='status-button bg-blue-500/20 text-blue-100 hover:bg-blue-500/30 border-blue-500/30 h-12'
                  >
                    <Clock className='h-5 w-5 mr-2' />
                    Callback
                  </Button>
                </div>

                <div className='flex gap-3 pt-4 border-t border-white/10'>
                  <Button
                    variant='outline'
                    onClick={previousLead}
                    disabled={currentLeadIndex === 0}
                    className='glass-button text-white flex-1'
                  >
                    ← Previous
                  </Button>
                  <Button
                    onClick={nextLead}
                    disabled={currentLeadIndex === leads.length - 1}
                    className='primary-button flex-1'
                  >
                    <SkipForward className='h-4 w-4 mr-2' />
                    Next Lead →
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* All Leads Table */}
        <Card className='glass-card fade-in'>
          <CardHeader>
            <CardTitle className='text-white text-xl flex items-center gap-2'>
              <div className='p-1.5 rounded-full bg-white/10 backdrop-blur-md'>
                <Sparkles className='h-4 w-4' />
              </div>
              All Leads Overview
            </CardTitle>
            <CardDescription className='text-white/70'>Track your progress and jump to any lead</CardDescription>
          </CardHeader>
          <CardContent>
            <div className='glass-card rounded-xl overflow-hidden'>
              <Table>
                <TableHeader>
                  <TableRow className='border-white/10 hover:bg-white/5'>
                    <TableHead className='text-white/80 font-medium'>ID</TableHead>
                    <TableHead className='text-white/80 font-medium'>Business Name</TableHead>
                    <TableHead className='text-white/80 font-medium'>Phone</TableHead>
                    <TableHead className='text-white/80 font-medium'>Status</TableHead>
                    <TableHead className='text-white/80 font-medium'>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead, index) => {
                    const config = statusConfig[lead.status];
                    const Icon = config.icon;
                    return (
                      <TableRow
                        key={lead.id}
                        className={`border-white/10 transition-all duration-200 ${
                          index === currentLeadIndex ? 'bg-white/10 scale-[1.02]' : 'hover:bg-white/5'
                        }`}
                        style={{
                          backgroundColor: lead.status !== 'pending' ? `${config.hexColor}10` : undefined
                        }}
                      >
                        <TableCell className='text-white/90 font-medium'>{lead.id}</TableCell>
                        <TableCell className='text-white font-medium'>{lead.name}</TableCell>
                        <TableCell className='text-white/90 font-mono'>{lead.phone}</TableCell>
                        <TableCell>
                          <Badge className={`${config.color} backdrop-blur-md`}>
                            <Icon className='h-3 w-3 mr-1' />
                            {config.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            size='sm'
                            variant='outline'
                            onClick={() => setCurrentLeadIndex(index)}
                            className='glass-button text-white text-xs'
                          >
                            Select
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
